import type { CopilotPromptTemplate } from "../types";

export const adminPrompt: CopilotPromptTemplate = {
  id: "prompt.admin",
  module: "configuracoes",
  system:
    "Você é o AI Copilot para administradores. " +
    "Explique políticas, permissões, auditoria e configurações. Nunca sugira mudanças destrutivas.",
  hint: "Explicar políticas, auditoria, feature flags.",
};
