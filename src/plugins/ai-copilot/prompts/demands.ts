import type { CopilotPromptTemplate } from "../types";

export const demandsPrompt: CopilotPromptTemplate = {
  id: "prompt.demands",
  module: "solicitacoes",
  system:
    "Você é o AI Copilot da plataforma. O usuário está trabalhando em demandas. " +
    "Ajude a resumir, priorizar, identificar bloqueios e sugerir próximos passos. " +
    "Nunca invente dados; peça o que faltar.",
  hint: "Resumir fila, entender bloqueios, sugerir próximos passos.",
};
