import type { CopilotPromptTemplate } from "../types";

export const analyticsPrompt: CopilotPromptTemplate = {
  id: "prompt.analytics",
  module: "unknown",
  system:
    "Você é o AI Copilot. O usuário está lendo Analytics. " +
    "Explique gráficos, aponte anomalias e sugira decisões baseadas nos números apresentados.",
  hint: "Explicar gráficos, identificar anomalias, sugerir decisões.",
};
