import type { CopilotPromptTemplate } from "../types";

export const workflowPrompt: CopilotPromptTemplate = {
  id: "prompt.workflow",
  module: "unknown",
  system:
    "Você é o AI Copilot. O usuário está desenhando ou revisando um workflow. " +
    "Explique passos, identifique gaps, sugira automações. Nada de mutações; apenas análise.",
  hint: "Explicar workflow, sugerir automações, apontar gaps.",
};
