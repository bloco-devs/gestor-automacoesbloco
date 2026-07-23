/**
 * Commands do plugin AI Copilot.
 * Todos apenas emitem eventos scoped e alimentam Developer Tools.
 * NÃO chamam edge functions nem alteram estado do core.
 */
import type { PluginCommand } from "@/platform-sdk";
import { emitCopilotEvent } from "../events";
import { readCopilotContext, summarizeCopilotContext } from "../context/provider";
import { routePrompt } from "../prompts";
import { COPILOT_ACTIONS, ctxSummary } from "../actions";
import { appendMessage } from "../memory";
import { estimateTokens } from "../utils/tokens";
import { recordDiagnostic } from "../utils/diagnostics";
import type { CopilotAction } from "../types";

function runAction(action: CopilotAction, source: string) {
  const t0 = performance.now();
  const ctx = readCopilotContext();
  const template = routePrompt(ctx);
  const prompt = action.buildPrompt(ctx);
  const tokens = estimateTokens(`${template.system}\n${prompt}`);

  appendMessage({
    id: `msg-${Date.now()}`,
    role: "user",
    content: prompt,
    at: Date.now(),
    meta: { actionId: action.id, template: template.id },
  });

  emitCopilotEvent("copilot.prompt.generated", {
    module: ctx.module,
    template: template.id,
    tokensEstimated: tokens,
  });
  emitCopilotEvent("copilot.action.executed", {
    actionId: action.id,
    module: ctx.module,
  });

  recordDiagnostic({
    at: Date.now(),
    actionId: `${action.id} (${source})`,
    module: ctx.module,
    template: template.id,
    tokensEstimated: tokens,
    contextSummary: ctxSummary(ctx),
    durationMs: performance.now() - t0,
  });
}

export const copilotCommands: PluginCommand[] = [
  {
    id: "copilot.open",
    title: "Copilot · Abrir",
    description: "Abre o Copilot Dock.",
    shortcut: "mod+shift+/",
    section: "AI Copilot",
    run: () => {
      emitCopilotEvent("copilot.opened", { at: Date.now(), source: "command" });
    },
  },
  {
    id: "copilot.ask",
    title: "Copilot · Perguntar",
    description: "Gera pergunta contextual.",
    section: "AI Copilot",
    run: () => {
      const summarize = COPILOT_ACTIONS.find((a) => a.id === "copilot.summarize");
      if (summarize) runAction(summarize, "ask");
    },
  },
  {
    id: "copilot.explain",
    title: "Copilot · Explicar tela",
    description: "Explica a tela atual.",
    section: "AI Copilot",
    run: () => {
      const explain = COPILOT_ACTIONS.find((a) => a.id === "copilot.explain");
      if (explain) runAction(explain, "command");
    },
  },
  {
    id: "copilot.summarize",
    title: "Copilot · Resumir",
    description: "Resume o conteúdo visível.",
    section: "AI Copilot",
    run: () => {
      const s = COPILOT_ACTIONS.find((a) => a.id === "copilot.summarize");
      if (s) runAction(s, "command");
    },
  },
  {
    id: "copilot.generate",
    title: "Copilot · Gerar documentação",
    description: "Rascunha artigo a partir do contexto.",
    section: "AI Copilot",
    run: () => {
      const g = COPILOT_ACTIONS.find((a) => a.id === "copilot.docgen");
      if (g) runAction(g, "command");
    },
  },
];

/** Helper exposto para testes e widgets. */
export { runAction };

/** Snapshot público do contexto (para Sandbox). */
export { summarizeCopilotContext };
