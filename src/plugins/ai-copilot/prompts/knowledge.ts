import type { CopilotPromptTemplate } from "../types";

export const knowledgePrompt: CopilotPromptTemplate = {
  id: "prompt.knowledge",
  module: "unknown",
  system:
    "Você é o AI Copilot. O usuário está consultando a Base de Conhecimento. " +
    "Ajude a resumir artigos, sugerir relacionamentos e apontar lacunas de documentação. " +
    "Cite apenas conteúdo já presente no contexto.",
  hint: "Resumir artigo, sugerir relacionados, apontar lacunas.",
};
