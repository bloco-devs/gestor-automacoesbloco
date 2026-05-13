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
  "TI",
  "Legalização",
  "Engenharia",
  "RH",
] as const;
export type Setor = typeof SETORES[number];

export type Frequencia = 1 | 2 | 3 | 4; // Eventual, Mensal, Semanal, Diária
export const FREQUENCIA_LABEL: Record<Frequencia, string> = {
  1: "Eventual",
  2: "Mensal",
  3: "Semanal",
  4: "Diária",
};

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
  complexidade: number; // 1-5
  retorno: number; // 1-5
  status: PipelineStatus;
  score: number; // 0-100
  setor?: Setor | string;
  notasTecnicas?: string;
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
