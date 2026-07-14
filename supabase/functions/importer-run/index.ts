// RFC-001 Fase 4 — importer-run
// Executa o Runner sobre um job já criado por importer-upload.
// Escopo desta fase: SOMENTE DryRunExecutor. Nenhuma escrita no Kanban.
//
// Fluxo:
//   1) Autentica usuário; carrega job (RLS enforça dono).
//   2) Baixa arquivo do bucket privado (service-role).
//   3) Adapter Trello parse -> CanonicalSnapshot.
//   4) Transição queued -> running via RPC (assertiva de estado).
//   5) Runner com DryRunExecutor (progresso via RPC; cancel via poll).
//   6) Finaliza via RPC atividades_import_job_finalize com o report.
//
// Payload JSON:
//   { job_id: string, storage_path: string,
//     target: ImportTarget, selection: ImportSelection,
//     card_conflict?: "import_all"|"skip_same_title_same_column"|"force_import",
//     resolutions?: ImportResolutions }
//
// dry_run é forçado como true nesta fase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { CoreRunner } from "../_shared/importers/core/runner.ts";
import { DryRunExecutor } from "../_shared/importers/core/executor.ts";
import { RealExecutor } from "../_shared/importers/core/real-executor.ts";
import {
  trelloSnapshotFromJson,
  trelloSnapshotFromZip,
  TRELLO_ADAPTER_VERSION,
  TRELLO_SOURCE,
} from "../_shared/importers/trello/index.ts";
import { RUNNER_VERSION, SNAPSHOT_VERSION } from "../_shared/importers/core/versions.ts";
import { logger } from "../_shared/importers/core/logger.ts";
import { newRequestId, removeJobObjects, sniffContentKind } from "../_shared/importers/core/hardening.ts";
import type {
  ImportOptions,
  ImportResolutions,
  ImportSelection,
  ImportTarget,
  RunReport,
} from "../_shared/importers/core/interfaces.ts";

const BUCKET = "atividades-import-tmp";
// Timeout defensivo — a Edge Function tem seu próprio limite; paramos antes
// para poder finalizar o job com report coerente.
const RUN_TIMEOUT_MS = 55_000;

function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7) : null;
}

interface RunBody {
  job_id: string;
  storage_path: string;
  target: ImportTarget;
  selection: ImportSelection;
  card_conflict?: ImportOptions["card_conflict"];
  resolutions?: ImportResolutions;
}

function validateBody(x: unknown): x is RunBody {
  if (!x || typeof x !== "object") return false;
  const b = x as Record<string, unknown>;
  return typeof b.job_id === "string"
    && typeof b.storage_path === "string"
    && !!b.target && typeof b.target === "object"
    && !!b.selection && typeof b.selection === "object";
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const request_id = req.headers.get("x-request-id") ?? newRequestId();

  const token = bearer(req);
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthenticated" }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const svc = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData } = await userClient.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    return new Response(JSON.stringify({ error: "unauthenticated" }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (!validateBody(body)) {
    return new Response(JSON.stringify({ error: "invalid_body" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const { job_id, storage_path, target, selection, card_conflict, resolutions } = body;

  // caminho deve estar dentro da pasta do usuário
  if (!storage_path.startsWith(`${uid}/${job_id}/`)) {
    return new Response(JSON.stringify({ error: "forbidden_path" }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const log = logger.child({ job_id, request_id, source: TRELLO_SOURCE, fn: "importer-run" });
  const jobPrefix = `${uid}/${job_id}`;

  // Carrega job (RLS: dono)
  const { data: jobRow, error: jobErr } = await userClient
    .from("atividades_import_jobs")
    .select("id,status,source,file_hash,file_name")
    .eq("id", job_id)
    .maybeSingle();
  if (jobErr || !jobRow) {
    return new Response(JSON.stringify({ error: jobErr?.message ?? "job_not_found" }),
      { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (jobRow.source !== TRELLO_SOURCE) {
    return new Response(JSON.stringify({ error: `unsupported source on job: ${jobRow.source}` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (jobRow.status !== "queued") {
    return new Response(JSON.stringify({ error: `job not queued (current=${jobRow.status})` }),
      { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Baixa arquivo (service-role)
  const dl = await svc.storage.from(BUCKET).download(storage_path);
  if (dl.error || !dl.data) {
    log.error("download_failed", { message: dl.error?.message });
    return new Response(JSON.stringify({ error: `download_failed: ${dl.error?.message ?? "unknown"}` }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const bytes = new Uint8Array(await dl.data.arrayBuffer());
  void ((jobRow.file_name as string | null) ?? storage_path.split("/").pop() ?? "");

  // Sniff real do conteúdo (não confia na extensão)
  const kind = sniffContentKind(bytes);
  if (kind === "unknown") {
    log.error("content_sniff_unknown");
    await userClient.rpc("atividades_import_job_cancel", { _job_id: job_id }).catch(() => {});
    await removeJobObjects(svc, BUCKET, jobPrefix);
    return new Response(JSON.stringify({ error: "conteúdo inválido (não é JSON nem ZIP)" }),
      { status: 415, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Parse -> Snapshot
  let snapshot;
  try {
    snapshot = kind === "zip"
      ? await trelloSnapshotFromZip(bytes)
      : await trelloSnapshotFromJson(bytes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error("adapter_parse_failed", { phase: "parse", message: msg });
    await userClient.rpc("atividades_import_job_cancel", { _job_id: job_id }).catch(() => {});
    await removeJobObjects(svc, BUCKET, jobPrefix);
    return new Response(JSON.stringify({ error: `adapter_parse_failed: ${msg}` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  // Transição queued -> running
  {
    const { error } = await userClient.rpc("atividades_import_job_update_progress", {
      _job_id: job_id,
      _progress: { phase: "boot", current: 0, total: 1, percent: 0, message: "Iniciando dry-run" },
      _status: "running",
    });
    if (error) {
      log.error("start_transition_failed", { message: error.message });
      return new Response(JSON.stringify({ error: error.message }),
        { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }

  // Cancel poll cooperativo (a cada N chamadas)
  let cancelPollCounter = 0;
  const isCancelled = async (): Promise<boolean> => {
    // Amostra 1 a cada 3 chamadas para reduzir carga sem prejudicar responsividade.
    if ((cancelPollCounter++ % 3) !== 0) return false;
    const { data } = await userClient
      .from("atividades_import_jobs")
      .select("status")
      .eq("id", job_id)
      .maybeSingle();
    return data?.status === "cancelled";
  };

  const options: ImportOptions = {
    selection,
    card_conflict: card_conflict ?? "import_all",
    dry_run: true,
  };

  const runner = new CoreRunner();
  const executor = new DryRunExecutor({
    job_id,
    client: {
      rpc: (fn, args) => userClient.rpc(fn, args) as unknown as Promise<{ data: unknown; error: { message: string } | null }>,
    },
    isCancelled,
  });

  let report: RunReport;
  let timedOut = false;
  try {
    const runPromise = runner.execute({
      snapshot,
      options,
      target,
      resolutions: resolutions ?? { members: [] },
      executor,
      adapter_version: TRELLO_ADAPTER_VERSION,
      runner_version: RUNNER_VERSION,
      file_hash: (jobRow.file_hash as string | null) ?? "",
    });
    const timeoutPromise = new Promise<RunReport>((_, reject) => {
      setTimeout(() => { timedOut = true; reject(new Error("run_timeout")); }, RUN_TIMEOUT_MS);
    });
    report = await Promise.race([runPromise, timeoutPromise]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.error(timedOut ? "runner_timeout" : "runner_crash", { message: msg });
    const failReport: Record<string, unknown> = {
      errors: [{ code: timedOut ? "run_timeout" : "runner_crash", message: msg }],
      adapter_version: TRELLO_ADAPTER_VERSION,
      snapshot_version: SNAPSHOT_VERSION,
      runner_version: RUNNER_VERSION,
      file_hash: (jobRow.file_hash as string | null) ?? "",
      timed_out: timedOut,
    };
    await userClient.rpc("atividades_import_job_finalize", {
      _job_id: job_id,
      _status: "failed",
      _report: failReport,
      _board_id_local: null,
    }).catch(() => {});
    await removeJobObjects(svc, BUCKET, jobPrefix);
    return new Response(JSON.stringify({ error: msg, request_id }),
      { status: timedOut ? 504 : 500, headers: { ...cors, "Content-Type": "application/json", "x-request-id": request_id } });
  }

  // Verifica se cancelou durante execução
  const { data: after } = await userClient
    .from("atividades_import_jobs")
    .select("status")
    .eq("id", job_id)
    .maybeSingle();
  if (after?.status === "cancelled") {
    log.info("finalized_cancelled");
    await removeJobObjects(svc, BUCKET, jobPrefix);
    return new Response(JSON.stringify({ status: "cancelled", report, request_id }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json", "x-request-id": request_id } });
  }

  // Decide status final: success | partial | failed
  const hasErrors = (report.errors?.length ?? 0) > 0;
  const hasWarnings = (report.warnings?.length ?? 0) > 0 || (report.ignored?.length ?? 0) > 0;
  const finalStatus = hasErrors ? "failed" : hasWarnings ? "partial" : "success";

  const { error: finErr } = await userClient.rpc("atividades_import_job_finalize", {
    _job_id: job_id,
    _status: finalStatus,
    _report: report as unknown as Record<string, unknown>,
    _board_id_local: null,
  });
  if (finErr) {
    log.error("finalize_failed", { message: finErr.message });
    await removeJobObjects(svc, BUCKET, jobPrefix);
    return new Response(JSON.stringify({ error: finErr.message, report, request_id }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json", "x-request-id": request_id } });
  }

  // Cleanup do arquivo temporário — mantém apenas file_hash e metadados no banco
  const removed = await removeJobObjects(svc, BUCKET, jobPrefix);
  log.info("finalized", { status: finalStatus, duration_ms: report.duration_ms, storage_removed: removed });
  return new Response(JSON.stringify({ status: finalStatus, report, request_id }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json", "x-request-id": request_id } });
});
