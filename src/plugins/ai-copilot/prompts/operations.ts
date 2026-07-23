import type { CopilotPromptTemplate } from "../types";

export const operationsPrompt: CopilotPromptTemplate = {
  id: "prompt.operations",
  module: "unknown",
  system:
    "Você é o AI Copilot. O usuário está no Centro de Operações. " +
    "Ajude a interpretar SLA, carga da equipe e priorizar demandas em risco.",
  hint: "Analisar SLA, distribuir carga, priorizar risco.",
};
