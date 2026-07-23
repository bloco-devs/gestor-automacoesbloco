import type { CopilotPromptTemplate } from "../types";

export const portalPrompt: CopilotPromptTemplate = {
  id: "prompt.portal",
  module: "ai-workspace",
  system:
    "Você é o AI Copilot para solicitantes. " +
    "Fale linguagem de negócio (RH, Financeiro). Ajude a descrever a demanda com clareza.",
  hint: "Como descrever a demanda, o que é obrigatório informar.",
};
