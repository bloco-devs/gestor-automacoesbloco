// RFC-001 Fase 5 — tipos usados pelo Wizard (subset dos contratos do Core).
// NÃO importa nada de supabase/functions para manter a fronteira frontend/edge.

export type CardConflictStrategy =
  | "import_all"
  | "skip_same_title_same_column"
  | "force_import";

export interface ImportSelection {
  colunas: boolean;
  cards: boolean;
  etiquetas: boolean;
  checklists: boolean;
  comentarios: boolean;
  anexos: boolean;
  arquivados: boolean;
  membros: boolean;
}

export type TargetMode = "create_board" | "existing_board";

export interface ImportTarget {
  mode: TargetMode;
  board_id_local?: string;
  novo_board_nome?: string;
}

export type MemberStrategy = "map" | "ignore" | "history";

export interface MemberResolution {
  source_member_id: string;
  strategy: MemberStrategy;
  target_user_id?: string;
}

export interface ImportResolutions {
  members: MemberResolution[];
}

export interface ProgressUpdate {
  phase: string;
  current: number;
  total: number;
  percent: number;
  message: string;
}

export interface CountsByEntity {
  boards?: number;
  colunas?: number;
  labels?: number;
  cards?: number;
  checklists?: number;
  checklist_items?: number;
  comentarios?: number;
  anexos?: number;
  membros?: number;
}

export interface IgnoredItem {
  entity_type: string;
  external_id: string;
  motivo: string;
}
export interface WarningItem {
  code: string;
  message: string;
  entity_type?: string;
  external_id?: string;
}
export interface ErrorItem {
  code: string;
  message: string;
  entity_type?: string;
  external_id?: string;
}

export interface RunReport {
  duration_ms: number;
  created: CountsByEntity;
  reused: CountsByEntity;
  ignored: IgnoredItem[];
  warnings: WarningItem[];
  errors: ErrorItem[];
  adapter_version: string;
  snapshot_version: string;
  runner_version: string;
  file_hash: string;
  board_id_local?: string | null;
  dry_run?: boolean;
}

export type JobStatus =
  | "queued"
  | "running"
  | "success"
  | "partial"
  | "failed"
  | "cancelled";

export interface JobRow {
  id: string;
  status: JobStatus;
  progress: ProgressUpdate | null;
  report: RunReport | null;
  board_id_local?: string | null;
  file_name: string | null;
  source: string;
}

export interface DetectedBoard {
  external_id: string;
  nome: string;
  /** true quando o adapter server-side vai processar apenas este board */
  cards?: number;
}

export interface DetectedFile {
  kind: "json" | "zip";
  boards: DetectedBoard[];
  /** quando vazio significa: adapter server-side decidirá (fallback). */
  fallback?: boolean;
  /** Se preenchido, o arquivo é inválido e o upload deve ser bloqueado. */
  invalidReason?: string;
}

export const DEFAULT_SELECTION: ImportSelection = {
  colunas: true,
  cards: true,
  etiquetas: true,
  checklists: true,
  comentarios: true,
  anexos: false,
  arquivados: false,
  membros: true,
};
