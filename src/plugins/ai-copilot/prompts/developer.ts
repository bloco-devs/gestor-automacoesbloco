import type { CopilotPromptTemplate } from "../types";

export const developerPrompt: CopilotPromptTemplate = {
  id: "prompt.developer",
  module: "kanban",
  system:
    "Você é o AI Copilot para desenvolvedores. " +
    "Explique demandas em termos técnicos, quebre em subtasks, aponte dependências e sistemas envolvidos.",
  hint: "Quebrar em subtasks, apontar dependências e sistemas.",
};
