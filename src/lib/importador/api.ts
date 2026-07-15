// RFC-001 Fase 5 — camada fina de acesso ao backend do importador.
// Reusa APENAS as RPCs/edge functions já existentes.
import { supabase } from "@/integrations/supabase/client";
import type {
  ImportResolutions,
  ImportSelection,
  ImportTarget,
  JobRow,
  JobStatus,
  ProgressUpdate,
  RunReport,
  CardConflictStrategy,
} from "./types";

export interface UploadResult {
  job_id: string;
  storage_path: string;
  file_hash: string;
  file_size: number;
  source: string;
  target_mode: string;
}

/**
 * `supabase.functions.invoke` retorna um `FunctionsHttpError` genérico quando
 * o status é non-2xx. A mensagem real do servidor fica em `error.context` (Response),
 * que precisa ser lido manualmente para exibir algo útil ao usuário.
 */
async function extractInvokeError(error: unknown, fallback: string): Promise<Error> {
  const anyErr = error as { message?: string; context?: Response } | null;
  const ctx = anyErr?.context;
  if (ctx && typeof (ctx as Response).text === "function") {
    try {
      const text = await (ctx as Response).clone().text();
      if (text) {
        try {
          const parsed = JSON.parse(text) as { error?: string; message?: string };
          const msg = parsed.error ?? parsed.message;
          if (msg) return new Error(msg);
        } catch { /* not json */ }
        return new Error(text);
      }
    } catch { /* ignore */ }
  }
  return new Error(anyErr?.message || fallback);
}


export async function uploadImportFile(input: {
  file: File;
  source: "trello";
  targetMode: "create_board" | "existing_board";
  options?: Record<string, unknown>;
}): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("source", input.source);
  fd.append("target_mode", input.targetMode);
  if (input.options) fd.append("options", JSON.stringify(input.options));

  const { data, error } = await supabase.functions.invoke("importer-upload", { body: fd });
  if (error) throw await extractInvokeError(error, "Falha no upload");
  if (!data || typeof (data as any).job_id !== "string") {
    throw new Error("Resposta inválida do importer-upload");
  }
  return data as UploadResult;
}

export interface RunInput {
  job_id: string;
  storage_path: string;
  target: ImportTarget;
  selection: ImportSelection;
  card_conflict?: CardConflictStrategy;
  resolutions?: ImportResolutions;
  dry_run?: boolean;
}

export interface RunResult {
  status: JobStatus;
  report: RunReport;
  board_id_local?: string | null;
  dry_run?: boolean;
  request_id?: string;
}

function normalizeReport(report: unknown): RunReport {
  const r = (report && typeof report === "object" ? report : {}) as Partial<RunReport>;
  return {
    duration_ms: typeof r.duration_ms === "number" ? r.duration_ms : 0,
    created: r.created && typeof r.created === "object" ? r.created : {},
    reused: r.reused && typeof r.reused === "object" ? r.reused : {},
    ignored: Array.isArray(r.ignored) ? r.ignored : [],
    warnings: Array.isArray(r.warnings) ? r.warnings : [],
    errors: Array.isArray(r.errors) ? r.errors : [],
    adapter_version: typeof r.adapter_version === "string" ? r.adapter_version : "—",
    snapshot_version: typeof r.snapshot_version === "string" ? r.snapshot_version : "—",
    runner_version: typeof r.runner_version === "string" ? r.runner_version : "—",
    file_hash: typeof r.file_hash === "string" ? r.file_hash : "",
    board_id_local: r.board_id_local ?? null,
    dry_run: r.dry_run,
  };
}

export async function runImportJob(input: RunInput): Promise<RunResult> {
  const { data, error } = await supabase.functions.invoke("importer-run", { body: input });
  if (error) throw await extractInvokeError(error, "Falha ao executar importação");
  const result = data as Partial<RunResult> | null;
  return {
    status: (result?.status ?? "failed") as JobStatus,
    report: normalizeReport(result?.report),
    board_id_local: result?.board_id_local ?? normalizeReport(result?.report).board_id_local ?? null,
    dry_run: result?.dry_run,
    request_id: result?.request_id,
  };
}

export async function cancelImportJob(jobId: string): Promise<void> {
  const { error } = await supabase.rpc("atividades_import_job_cancel", { _job_id: jobId });
  if (error) throw new Error(error.message);
}

export async function fetchJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("atividades_import_jobs")
    .select("id,status,progress,report,board_id_local,file_name,source")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    status: data.status as JobStatus,
    progress: (data.progress ?? null) as unknown as ProgressUpdate | null,
    report: data.report ? normalizeReport(data.report) : null,
    board_id_local: (data.board_id_local ?? null) as string | null,
    file_name: (data.file_name ?? null) as string | null,
    source: data.source as string,
  };
}

/**
 * Assina Realtime da tabela atividades_import_jobs para um job específico.
 * Retorna função de unsubscribe. Cleanup dentro de useEffect é responsabilidade do chamador.
 */
export function subscribeJob(
  jobId: string,
  onChange: (row: JobRow) => void,
): () => void {
  const channel = supabase
    .channel(`import-job-${jobId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "atividades_import_jobs", filter: `id=eq.${jobId}` },
      (payload) => {
        const n = payload.new as Record<string, unknown>;
        onChange({
          id: String(n.id),
          status: n.status as JobStatus,
          progress: (n.progress ?? null) as unknown as ProgressUpdate | null,
          report: n.report ? normalizeReport(n.report) : null,
          board_id_local: (n.board_id_local ?? null) as string | null,
          file_name: (n.file_name ?? null) as string | null,
          source: String(n.source ?? ""),
        });
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function downloadReportJson(report: RunReport, filename = "relatorio-importacao.json"): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
