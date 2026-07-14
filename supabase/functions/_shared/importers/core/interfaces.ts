// RFC-001 — Framework de Importadores
// Contratos ÚNICOS e neutros. Nenhuma dependência de origem (Trello/Jira/etc).
// Fonte da verdade: este arquivo. Adapters e Runner devem se conformar a estes tipos.

export type ImportSource = string; // "trello" | "jira" | "csv" | ...

// ---------- CanonicalSnapshot ----------
// Modelo canônico agnóstico. `payload_extra` guarda metadados de origem.

export interface CanonicalMember {
  external_id: string;
  username?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
}

export interface CanonicalLabel {
  external_id: string;
  board_external_id: string;
  nome: string;
  cor: string;
}

export interface CanonicalList {
  external_id: string;
  board_external_id: string;
  nome: string;
  ordem: number;
  arquivada?: boolean;
}

export interface CanonicalChecklistItem {
  external_id: string;
  checklist_external_id: string;
  texto: string;
  ordem: number;
  concluido: boolean;
}

export interface CanonicalChecklist {
  external_id: string;
  card_external_id: string;
  nome: string;
  ordem: number;
  items: CanonicalChecklistItem[];
}

export interface CanonicalComment {
  external_id: string;
  card_external_id: string;
  autor_external_id?: string;
  texto_md: string;
  criado_em: string; // ISO
}

export interface CanonicalAttachment {
  external_id: string;
  card_external_id: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number;
  url?: string;         // origem remota (quando aplicável)
  bytes_base64?: string; // conteúdo embutido (quando aplicável)
}

export interface CanonicalCard {
  external_id: string;
  list_external_id: string;
  board_external_id: string;
  titulo: string;
  descricao_md?: string;
  data_entrega?: string; // ISO
  ordem: number;
  arquivado?: boolean;
  concluido?: boolean;
  label_external_ids?: string[];
  membro_external_ids?: string[];
  cover_url?: string;
}

export interface CanonicalBoard {
  external_id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  background?: string;
  cover_url?: string;
}

export interface CanonicalWorkspace {
  external_id: string;
  nome: string;
}

export interface CanonicalSnapshot {
  snapshot_version: string; // ex: "1.0"
  source: ImportSource;
  workspaces: CanonicalWorkspace[];
  boards: CanonicalBoard[];
  lists: CanonicalList[];
  labels: CanonicalLabel[];
  cards: CanonicalCard[];
  checklists: CanonicalChecklist[];
  comments: CanonicalComment[];
  attachments: CanonicalAttachment[];
  members: CanonicalMember[];
}

// ---------- Opções e resoluções ----------

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

export type CardConflictStrategy =
  | 'import_all'
  | 'skip_same_title_same_column'
  | 'force_import';

export interface ImportOptions {
  selection: ImportSelection;
  card_conflict: CardConflictStrategy;
  dry_run: boolean;
}

export type MemberStrategy = 'map' | 'ignore' | 'history';

export interface MemberResolution {
  source_member_id: string;
  strategy: MemberStrategy;
  target_user_id?: string;
}

export interface ImportResolutions {
  members: MemberResolution[];
}

export type TargetMode = 'create_board' | 'existing_board';

export interface ImportTarget {
  mode: TargetMode;
  board_id_local?: string; // obrigatório se mode='existing_board'
  novo_board_nome?: string; // opcional se mode='create_board'
}

// ---------- Progress (formato estável) ----------

export interface ProgressUpdate {
  phase: string;   // "board" | "colunas" | "labels" | "cards" | "checklists" | "comentarios" | "anexos"
  current: number;
  total: number;
  percent: number; // 0..100 inteiro
  message: string;
}

// ---------- Relatórios ----------

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

export interface DryRunReport {
  created: CountsByEntity;
  reused: CountsByEntity;
  ignored: IgnoredItem[];
  warnings: WarningItem[];
  errors: ErrorItem[];
  adapter_version: string;
  snapshot_version: string;
  runner_version: string;
  file_hash: string;
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
}

// ---------- Contrato do Adapter ----------

export interface ImportAdapter<RawInput = unknown> {
  source: ImportSource;
  version: string; // semver do adapter
  /** Converte a entrada bruta (ex: JSON/ZIP já parseado em memória) no snapshot canônico. */
  toSnapshot(raw: RawInput): Promise<CanonicalSnapshot>;
}

// ---------- Executor: única porta para o banco ----------
// Proibido: SQL direto, acesso direto a tabelas do Kanban, bypass de RLS.
// Todas as escritas devem passar pelas RPCs existentes do módulo Atividades.

export interface ExecutorContext {
  job_id: string;
  target: ImportTarget;
  options: ImportOptions;
  resolutions: ImportResolutions;
}

export interface CreatedRefs {
  board_id_local?: string;
  colunas: Map<string, string>;       // external_id -> local_id
  labels: Map<string, string>;
  cards: Map<string, string>;
  checklists: Map<string, string>;
  checklist_items: Map<string, string>;
  comentarios: Map<string, string>;
  anexos: Map<string, string>;
}

export interface Executor {
  /** true = dry-run: nunca escreve. false = execução real, apenas via RPCs. */
  readonly dry_run: boolean;

  /** Consulta idempotência: retorna local_id se a entidade externa já foi criada por este job. */
  lookupEntity(entity_type: string, external_id: string): Promise<string | null>;

  /** Registra o mapa externo->local para o job (idempotente). */
  registerEntity(entity_type: string, external_id: string, local_id: string): Promise<void>;

  createBoard(board: CanonicalBoard, target: ImportTarget): Promise<string>;
  createColuna(local_board_id: string, list: CanonicalList): Promise<string>;
  reuseColuna(local_board_id: string, list: CanonicalList): Promise<string | null>;
  createLabel(local_board_id: string, label: CanonicalLabel): Promise<string>;
  reuseLabel(local_board_id: string, label: CanonicalLabel): Promise<string | null>;
  createCard(local_board_id: string, local_coluna_id: string, card: CanonicalCard): Promise<string>;
  linkCardLabel(local_card_id: string, local_label_id: string): Promise<void>;
  createChecklist(local_card_id: string, checklist: CanonicalChecklist): Promise<string>;
  createChecklistItem(local_checklist_id: string, item: CanonicalChecklistItem): Promise<string>;
  createComentario(local_card_id: string, comment: CanonicalComment): Promise<string>;
  createAnexo(local_card_id: string, local_board_id: string, att: CanonicalAttachment): Promise<string>;

  reportProgress(update: ProgressUpdate): Promise<void>;
  isCancelled(): Promise<boolean>;
}

// ---------- Runner ----------

export interface RunnerInput {
  snapshot: CanonicalSnapshot;
  options: ImportOptions;
  target: ImportTarget;
  resolutions: ImportResolutions;
  executor: Executor;
  adapter_version: string;
  runner_version: string;
  file_hash: string;
}

export interface Runner {
  execute(input: RunnerInput): Promise<RunReport>;
}
