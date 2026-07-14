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
  if (error) throw new Error(error.message || "Falha no upload");
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

export async function runImportJob(input: RunInput): Promise<RunResult> {
  const { data, error } = await supabase.functions.invoke("importer-run", { body: input });
  if (error) throw new Error(error.message || "Falha ao executar importação");
  return data as RunResult;
}

export async function cancelImportJob(jobId: string): Promise<void> {
  const { error } = await supabase.rpc("atividades_import_job_cancel", { _job_id: jobId });
  if (error) throw new Error(error.message);
}

export async function fetchJob(jobId: string): Promise<JobRow | null> {
  const { data, error } = await supabase
    .from("atividades_import_jobs")
    .select("id,status,progress,report,file_name,source")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    status: data.status as JobStatus,
    progress: (data.progress ?? null) as unknown as ProgressUpdate | null,
    report: (data.report ?? null) as unknown as RunReport | null,
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
          report: (n.report ?? null) as unknown as RunReport | null,
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
