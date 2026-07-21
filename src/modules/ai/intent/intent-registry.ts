import type { IntentDefinition, IntentId } from "./intent-types";

/**
 * Registro estático de intenções. Novos pipelines/intents podem ser
 * adicionados aqui sem alterar o Workspace.
 */
export const INTENT_REGISTRY: Record<IntentId, IntentDefinition> = {
  BUG: {
    id: "BUG",
    label: "Bug",
    description: "Algo no sistema está com defeito ou comportamento incorreto.",
    keywords: [
      "bug", "erro", "falha", "quebrou", "quebrado", "não funciona",
      "nao funciona", "não salva", "nao salva", "trava", "travando",
      "não abre", "nao abre", "não carrega", "nao carrega", "defeito",
    ],
    patterns: [/n[ãa]o (est[áa] )?funciona/i, /d[áa] erro/i],
    pipeline: "bug",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Alta",
    suggestedCategory: "Erro",
  },
  INCIDENT: {
    id: "INCIDENT",
    label: "Incidente",
    description: "Indisponibilidade ou impacto amplo em produção.",
    keywords: [
      "fora do ar", "indisponível", "indisponivel", "caiu", "sistema fora",
      "todos afetados", "produção parada", "producao parada", "urgente",
    ],
    patterns: [/fora do ar/i, /sistema (est[áa])? ?(caiu|parado)/i],
    pipeline: "incident",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Alta",
    suggestedCategory: "Incidente",
  },
  FEATURE_REQUEST: {
    id: "FEATURE_REQUEST",
    label: "Nova Funcionalidade",
    description: "Pedido de uma funcionalidade que ainda não existe.",
    keywords: [
      "gostaria", "poderia ter", "seria bom ter", "queria uma opção",
      "queria uma opcao", "nova funcionalidade", "adicionar", "incluir",
      "exportar", "importar", "criar tela", "novo recurso",
    ],
    pipeline: "feature",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Média",
    suggestedCategory: "Feature",
  },
  IMPROVEMENT: {
    id: "IMPROVEMENT",
    label: "Melhoria",
    description: "Ajuste ou refinamento de uma funcionalidade existente.",
    keywords: [
      "melhorar", "aprimorar", "otimizar", "refinar", "ajustar",
      "deixar mais", "ficaria melhor", "sugiro melhorar",
    ],
    patterns: [/melhor(ar|ia)/i, /aprimor(ar|amento)/i],
    pipeline: "improvement",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Média",
    suggestedCategory: "Melhoria",
  },
  AUTOMATION: {
    id: "AUTOMATION",
    label: "Automação",
    description: "Pedido para automatizar um processo manual.",
    keywords: [
      "automatizar", "automatização", "automatizacao", "automação",
      "automacao", "rotina automática", "rotina automatica", "robô", "robo",
      "integração automática", "integracao automatica",
    ],
    pipeline: "automation",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Média",
    suggestedCategory: "Automação",
  },
  QUESTION: {
    id: "QUESTION",
    label: "Pergunta",
    description: "Usuário quer saber como fazer algo no sistema.",
    keywords: [
      "como ", "como faço", "como fazer", "onde encontro", "onde fica",
      "posso ", "é possível", "e possivel", "qual o caminho",
    ],
    patterns: [/^como\b/i, /\?\s*$/],
    pipeline: "question",
    shouldCreateTicket: false,
    shouldAskQuestion: false,
    shouldSearchKnowledge: true,
    shouldRespondImmediately: true,
    suggestedPriority: null,
    suggestedCategory: "Dúvida",
  },
  KNOWLEDGE: {
    id: "KNOWLEDGE",
    label: "Conhecimento",
    description: "Usuário busca documentação, política ou material de apoio.",
    keywords: [
      "documentação", "documentacao", "manual", "tutorial", "política",
      "politica", "procedimento", "wiki", "artigo", "faq",
    ],
    pipeline: "knowledge",
    shouldCreateTicket: false,
    shouldAskQuestion: false,
    shouldSearchKnowledge: true,
    shouldRespondImmediately: true,
    suggestedPriority: null,
    suggestedCategory: "Conhecimento",
  },
  SUPPORT: {
    id: "SUPPORT",
    label: "Suporte",
    description: "Usuário precisa de ajuda pontual (acesso, senha, permissão).",
    keywords: [
      "não consigo acessar", "nao consigo acessar", "senha", "login",
      "acesso negado", "permissão", "permissao", "bloqueado", "liberar",
    ],
    pipeline: "support",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: "Média",
    suggestedCategory: "Suporte",
  },
  UNKNOWN: {
    id: "UNKNOWN",
    label: "Não classificado",
    description: "Não foi possível identificar a intenção com confiança.",
    keywords: [],
    pipeline: "unknown",
    shouldCreateTicket: true,
    shouldAskQuestion: true,
    shouldSearchKnowledge: false,
    shouldRespondImmediately: false,
    suggestedPriority: null,
    suggestedCategory: null,
  },
};

export function getIntentDefinition(id: IntentId): IntentDefinition {
  return INTENT_REGISTRY[id];
}

export function listIntents(): IntentDefinition[] {
  return Object.values(INTENT_REGISTRY);
}
