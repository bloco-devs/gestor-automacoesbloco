/**
 * Human First UX — Dicionário central de termos por persona.
 * NUNCA use termos técnicos diretamente na UI para "solicitante" ou "gestor".
 */
import type { LanguageMap, Persona, TermKey, FriendlyError, FriendlyErrorKey } from "../types";

/** Base — persona "solicitante" (usuário leigo). Fonte de verdade dos termos humanos. */
export const SOLICITANTE_DICT: LanguageMap = {
  task: "Atividade",
  issue: "Problema",
  bug: "Erro",
  backlog: "Pendências",
  sprint: "Período de trabalho",
  kanban: "Acompanhamento",
  workflow: "Fluxo de atendimento",
  pipeline: "Etapas",
  ticket: "Solicitação",
  epic: "Projeto",
  story: "Solicitação",
  board: "Painel",
  developer: "Equipe técnica",
  release: "Publicação",
  deployment: "Atualização",
  command_palette: "Ações rápidas",
  workspace: "Área de trabalho",
  in_progress: "Em andamento",
  done: "Concluído",
  todo: "A fazer",
  new_request: "Conte o que aconteceu",
  description: "Explique seu problema",
  category: "Assunto",
  my_issues: "Meus pedidos",
  search: "Pesquisar",
  go_to: "Ir para",
  open: "Abrir",
  create: "Criar",
  find: "Encontrar",
};

/** Persona "tecnica" — pode ver termos originais. */
export const TECNICA_DICT: LanguageMap = {
  task: "Task",
  issue: "Issue",
  bug: "Bug",
  backlog: "Backlog",
  sprint: "Sprint",
  kanban: "Kanban",
  workflow: "Workflow",
  pipeline: "Pipeline",
  ticket: "Ticket",
  epic: "Epic",
  story: "Story",
  board: "Board",
  developer: "Desenvolvedor",
  release: "Release",
  deployment: "Deploy",
  command_palette: "Command Palette",
  workspace: "Workspace",
  in_progress: "In Progress",
  done: "Done",
  todo: "To Do",
  new_request: "Nova Solicitação",
  description: "Descrição",
  category: "Categoria",
  my_issues: "Minhas Issues",
  search: "Search",
  go_to: "Go to",
  open: "Open",
  create: "Create",
  find: "Find",
};

/** Persona "gestor" — linguagem executiva orientada a negócio. */
export const GESTOR_DICT: LanguageMap = {
  ...SOLICITANTE_DICT,
  backlog: "Pendências do time",
  sprint: "Ciclo atual",
  pipeline: "Fluxo de entrega",
  kanban: "Acompanhamento",
  workflow: "Processo",
  ticket: "Demanda",
  epic: "Iniciativa",
  story: "Demanda",
  board: "Painel executivo",
  release: "Entrega",
  deployment: "Publicação em produção",
  workspace: "Área de trabalho",
  in_progress: "Em execução",
  done: "Entregue",
  new_request: "Registrar demanda",
  description: "Contexto da demanda",
  category: "Área",
  my_issues: "Minhas demandas",
};

export const DICTIONARIES: Record<Persona, LanguageMap> = {
  solicitante: SOLICITANTE_DICT,
  tecnica: TECNICA_DICT,
  gestor: GESTOR_DICT,
};

/** Persona padrão quando não é possível inferir. */
export const DEFAULT_PERSONA: Persona = "solicitante";

/**
 * Traduz uma chave para a persona. Faz fallback para "solicitante" e depois
 * para a própria chave se inexistente (o que revela chaves ausentes em dev).
 */
export function translate(persona: Persona, key: TermKey): string {
  const dict = DICTIONARIES[persona] ?? DICTIONARIES[DEFAULT_PERSONA];
  return dict[key] ?? SOLICITANTE_DICT[key] ?? String(key);
}

/** Catálogo de mensagens de erro amigáveis (humanizadas). */
export const FRIENDLY_ERRORS: Record<FriendlyErrorKey, FriendlyError> = {
  generic: {
    title: "Algo não saiu como esperado",
    message: "Não foi possível concluir sua solicitação. Tente novamente em instantes.",
    action: "Tentar novamente",
    icon: "alert",
  },
  network: {
    title: "Sem conexão",
    message: "Ocorreu um problema de comunicação. Verifique sua internet.",
    action: "Tentar novamente",
    icon: "wifi",
  },
  timeout: {
    title: "Demorou mais do que o esperado",
    message: "A resposta demorou mais do que o esperado. Tente novamente.",
    action: "Tentar novamente",
    icon: "clock",
  },
  unauthorized: {
    title: "Acesso não permitido",
    message: "Você não tem permissão para ver este conteúdo.",
    action: "Voltar ao início",
    icon: "lock",
  },
  notFound: {
    title: "Não encontramos o que você procura",
    message: "O item que você tentou abrir não está mais disponível.",
    action: "Voltar",
    icon: "search",
  },
  rateLimit: {
    title: "Muitas tentativas em pouco tempo",
    message: "Aguarde alguns instantes antes de tentar novamente.",
    action: "Aguardar",
    icon: "clock",
  },
  server: {
    title: "Serviço temporariamente indisponível",
    message: "Estamos trabalhando para restabelecer. Tente novamente em alguns minutos.",
    action: "Tentar novamente",
    icon: "server",
  },
};
