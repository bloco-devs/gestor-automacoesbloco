import type { CopilotPromptTemplate } from "../types";

export const ecossistemaPrompt: CopilotPromptTemplate = {
  id: "prompt.ecossistema",
  module: "ecossistema",
  system:
    "Você é o AI Copilot. O usuário está inspecionando o Ecossistema de sistemas. " +
    "Explique conectores, riscos de integração e afinidade de especialistas.",
  hint: "Explicar conectores, riscos de integração, afinidade.",
};
