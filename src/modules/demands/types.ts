export type DemandStatus =
  | "backlog"
  | "a_fazer"
  | "em_desenvolvimento"
  | "em_testes"
  | "homologacao"
  | "concluido";

export type DemandPriority = "baixa" | "media" | "alta" | "critica";

export type DemandType =
  | "bug"
  | "melhoria"
  | "nova_funcionalidade"
  | "refatoracao"
  | "infraestrutura"
  | "automacao";

export type DemandComplexity = "facil" | "media" | "dificil";

export type DemandSlaStatus =
  | "no_prazo"
  | "atencao"
  | "estourado"
  | "pausado"
  | "cumprido";

export interface Demand {
  id: string;
  /** Código de rastreio legível gerado pelo banco (ex.: `RH-2607-0001`). */
  ticket_code?: string | null;
  title: string;

  description: string | null;
  system_id: string | null;
  status: DemandStatus;
  priority: DemandPriority;
  type: DemandType;
  complexity: DemandComplexity;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sla_due_at: string | null;
  sla_first_response_at: string | null;
  sla_status: DemandSlaStatus;
  ai_auto_responded?: boolean;
  ai_confidence_score?: number | null;
  ai_response_article_id?: string | null;
  ai_response_comment_id?: string | null;
  attachments_count?: number;
}

export interface DemandAttachment {
  id: string;
  demand_id: string;
  file_url: string;
  file_type: string | null;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface DemandTask {
  id: string;
  demand_id: string;
  title: string;
  completed: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileLite {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface DemandAIPlan {
  diagnostico: string;
  sugestao: string;
  subtarefas: string[];
  inserted_count: number;
}

export interface CreateDemandInput {
  title: string;
  description?: string | null;
  system_id?: string | null;
  type: DemandType;
  priority?: DemandPriority;
  complexity?: DemandComplexity;
  /** Slug do sistema no ecossistema. É dele que o banco monta o código do chamado. */
  sistema_slug?: string | null;
}

export const STATUS_COLUMNS: { id: DemandStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "a_fazer", label: "A Fazer" },
  { id: "em_desenvolvimento", label: "Em Desenvolvimento" },
  { id: "em_testes", label: "Em Testes" },
  { id: "homologacao", label: "Homologação" },
  { id: "concluido", label: "Concluído" },
];

export const PRIORITY_META: Record<DemandPriority, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
  media: { label: "Média", className: "bg-info/15 text-info border-info/30" },
  alta: { label: "Alta", className: "bg-warning/15 text-warning border-warning/30" },
  critica: { label: "Crítica", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

export const TYPE_META: Record<DemandType, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-destructive/10 text-destructive border-destructive/30" },
  melhoria: { label: "Melhoria", className: "bg-info/10 text-info border-info/30" },
  nova_funcionalidade: { label: "Nova Funcionalidade", className: "bg-success/10 text-success border-success/30" },
  refatoracao: { label: "Refatoração", className: "bg-warning/10 text-warning border-warning/30" },
  infraestrutura: { label: "Infraestrutura", className: "bg-secondary/20 text-secondary-foreground border-secondary/40" },
  automacao: { label: "Automação", className: "bg-accent/20 text-accent border-accent/40" },
};

export const COMPLEXITY_META: Record<DemandComplexity, { label: string }> = {
  facil: { label: "Fácil" },
  media: { label: "Média" },
  dificil: { label: "Difícil" },
};
