export type Role = "developer" | "requester";

export type PipelineStatus =
  | "novo"
  | "em_analise"
  | "aprovado"
  | "em_desenvolvimento"
  | "testando"
  | "pronto"
  | "em_producao";

export const PIPELINE_ORDER: PipelineStatus[] = [
  "novo",
  "em_analise",
  "em_desenvolvimento",
  "pronto",
];

export const STATUS_LABEL: Record<PipelineStatus, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  em_desenvolvimento: "Em Desenvolvimento",
  testando: "Testando",
  pronto: "Pronto",
  em_producao: "Em Produção",
};

export function statusToCategory(status: PipelineStatus): PipelineStatus {
  if (status === "aprovado" || status === "em_desenvolvimento") return "em_desenvolvimento";
  if (status === "testando" || status === "pronto" || status === "em_producao") return "pronto";
  return status;
}

export const SETORES = [
  "Comercial",
  "Marketing",
  "Financeiro",
  "CEO",
  "Tecnologia",
  "Legalização",
  "Engenharia",
  "Recursos Humanos",
] as const;
export type Setor = typeof SETORES[number];

/**
 * Frequência de utilização. Após a migração para escala unificada, é um número 0-10.
 * Valores legados (1-4) ainda existem em registros antigos até o backfill do Prompt 4.
 */
export type Frequencia = number;
export const FREQUENCIA_LABEL: Record<number, string> = {
  1: "Eventual",
  2: "Mensal",
  3: "Semanal",
  4: "Diária",
};

/** Label seguro para qualquer valor de frequência (legado 1-4 ou novo 0-10). */
export function freqLabel(n: number): string {
  return FREQUENCIA_LABEL[n] ?? `${n}/10`;
}

export interface Profile {
  id: string;
  email: string;
  nome: string;
  role: Role;
}

export interface Solicitacao {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: Frequencia;
  /** @deprecated Use `dificuldade` (0-10). Mantido para backward compatibility durante a migração. */
  complexidade: number; // 1-5 (legado)
  retorno: number; // 0-10 na nova escala (legado: 1-5)
  /** Percepção de dificuldade pelo solicitante (0-10). Substitui semanticamente `complexidade`. */
  dificuldade: number; // 0-10
  /** Complexidade técnica avaliada pelo dev (0-10). NULL = ainda não triada. */
  complexidadeDev: number | null; // 0-10 ou null
  status: PipelineStatus;
  /** @deprecated Use `scoreSolicitante` / `scoreFinal`. */
  score: number; // 0-100 (legado)
  /** Score parcial calculado a partir dos 3 fatores do solicitante (0-100). */
  scoreSolicitante: number; // 0-100
  /** Score final com penalização de complexidade técnica (0-100). NULL enquanto dev não avaliou. */
  scoreFinal: number | null; // 0-100 ou null
  setor?: Setor | string;
  /** @deprecated Use `notasTecnicasComplexidade`. Mantido apenas para leitura de dados legados. */
  notasTecnicas?: string;
  /** Notas/justificativa da avaliação técnica do dev (0-2000 chars). NULL enquanto não avaliado. */
  notasTecnicasComplexidade?: string | null;
  temIntegracao?: boolean;
  integracoes?: string[]; // softwares/sistemas integrados
  solicitanteId: string;
  solicitanteNome: string;
  createdAt: string;
  updatedAt: string;
}

export interface Solucao {
  id: string;
  solicitacaoId: string | null;
  titulo: string;
  descricao: string;
  link?: string | null;
  createdAt: string;
}

export type IntegracaoTipo = "consome" | "alimenta" | "bidirecional";

export interface Integracao {
  id: string;
  origemId: string; // solucao
  destinoId: string; // solucao
  tipo: IntegracaoTipo;
  descricao?: string;
}

export type MelhoriaStatus = "planejada" | "em_andamento" | "concluida";

export interface Melhoria {
  id: string;
  solucaoId: string;
  descricao: string;
  status: MelhoriaStatus;
  data: string;
}

export interface Task {
  id: string;
  solicitacaoId: string;
  titulo: string;
  concluida: boolean;
  assignedTo: string | null;
  ordem: number;
  createdAt: string;
}

export interface SolucaoTask {
  id: string;
  solucaoId: string;
  titulo: string;
  concluida: boolean;
  assignedTo: string | null;
  ordem: number;
  createdAt: string;
}

export interface Developer {
  id: string;
  nome: string;
  email: string;
}
