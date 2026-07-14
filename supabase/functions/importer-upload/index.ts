// RFC-001 Fase 4 — importer-upload
// Recebe o arquivo (JSON ou ZIP), calcula sha256, guarda em storage privado
// (`atividades-import-tmp/${uid}/${jobId}/${filename}`) e cria o job (status=queued).
// NÃO chama o Runner. NÃO altera Kanban. NÃO retorna URL assinada.
//
// Payload: multipart/form-data
//   file:        (obrigatório) File
//   source:      (obrigatório) "trello" por enquanto
//   target_mode: (obrigatório) "create_board" | "existing_board"
//   options:     (opcional) JSON string com ImportOptions
//
// Retorno: { job_id, storage_path, file_hash, file_size }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/importers/core/hashing.ts";
import { RUNNER_VERSION, SNAPSHOT_VERSION } from "../_shared/importers/core/versions.ts";
import { TRELLO_ADAPTER_VERSION, TRELLO_SOURCE } from "../_shared/importers/trello/version.ts";
import { logger } from "../_shared/importers/core/logger.ts";

const BUCKET = "atividades-import-tmp";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME = new Set([
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
]);

function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "upload.bin";
  return base.replace(/[^\w.\-]+/g, "_").slice(0, 200);
}

function bearer(req: Request): string | null {
  const h = req.headers.get("Authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7) : null;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } });
  }

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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new Response(JSON.stringify({ error: "expected multipart/form-data" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const file = form.get("file");
  const source = String(form.get("source") ?? "").trim();
  const targetMode = String(form.get("target_mode") ?? "").trim();
  const optionsRaw = form.get("options");

  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: "file is required" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (source !== TRELLO_SOURCE) {
    return new Response(JSON.stringify({ error: `unsupported source: ${source}` }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (targetMode !== "create_board" && targetMode !== "existing_board") {
    return new Response(JSON.stringify({ error: "invalid target_mode" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: `file size out of bounds (max ${MAX_BYTES})` }),
      { status: 413, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const mime = (file.type || "application/octet-stream").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return new Response(JSON.stringify({ error: `unsupported mime: ${mime}` }),
      { status: 415, headers: { ...cors, "Content-Type": "application/json" } });
  }

  let options: Record<string, unknown> = {};
  if (typeof optionsRaw === "string" && optionsRaw.length > 0) {
    try { options = JSON.parse(optionsRaw); } catch {
      return new Response(JSON.stringify({ error: "invalid options JSON" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const file_hash = await sha256Hex(bytes);
  const filename = sanitizeFilename(file.name || "upload.bin");

  // 1) cria job via RPC (usa auth.uid do usuário)
  const adapter_version = TRELLO_ADAPTER_VERSION;
  const { data: jobIdData, error: jobErr } = await userClient.rpc("atividades_import_job_create", {
    _source: source,
    _target_mode: targetMode,
    _options: options,
    _file_hash: file_hash,
    _file_name: filename,
    _file_size: file.size,
    _adapter_version: adapter_version,
    _snapshot_version: SNAPSHOT_VERSION,
    _runner_version: RUNNER_VERSION,
  });
  if (jobErr || !jobIdData) {
    logger.error("job_create_failed", { message: jobErr?.message });
    return new Response(JSON.stringify({ error: jobErr?.message ?? "job_create_failed" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  const job_id = String(jobIdData);
  const storage_path = `${uid}/${job_id}/${filename}`;

  // 2) upload no bucket privado (service-role — RLS bypass; caminho escopado por uid)
  const up = await svc.storage.from(BUCKET).upload(storage_path, bytes, {
    contentType: mime,
    upsert: false,
  });
  if (up.error) {
    logger.error("upload_failed", { job_id, message: up.error.message });
    // marca job como failed (queued -> cancelled não vale; via finalize precisa ser running).
    // Preferimos cancelar: queued -> cancelled é permitido pela RPC de cancel.
    await userClient.rpc("atividades_import_job_cancel", { _job_id: job_id }).catch(() => {});
    return new Response(JSON.stringify({ error: `upload_failed: ${up.error.message}` }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  logger.info("upload_ok", { job_id, source, size: file.size });
  return new Response(
    JSON.stringify({ job_id, storage_path, file_hash, file_size: file.size, source, target_mode: targetMode }),
    { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
