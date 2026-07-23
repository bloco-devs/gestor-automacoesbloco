import { useMemo } from "react";
import { summarizeCopilotContext } from "../context/provider";
import { routePrompt } from "../prompts";
import { readCopilotContext } from "../context/provider";
import { actionsFor } from "../actions";

/**
 * Painel Contextual — mostra o snapshot atual e ações relevantes.
 * Host que consumir slot "contextPanel" via useExtensionPoint renderiza.
 */
export default function CopilotContextPanel() {
  const ctx = readCopilotContext();
  const snap = useMemo(() => summarizeCopilotContext(ctx), [ctx]);
  const template = useMemo(() => routePrompt(ctx), [ctx]);
  const actions = useMemo(() => actionsFor(ctx.module), [ctx]);

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-xs">
      <div className="font-medium">AI Copilot</div>
      <div className="text-muted-foreground">
        {snap.module} · {snap.route}
      </div>
      <div className="text-muted-foreground">Prompt: {template.id}</div>
      <div className="text-muted-foreground">Entidade: {snap.entity}</div>
      <div className="flex flex-wrap gap-1 pt-1">
        {actions.slice(0, 5).map((a) => (
          <span
            key={a.id}
            className="rounded-full border border-border px-2 py-0.5"
          >
            {a.label}
          </span>
        ))}
      </div>
    </div>
  );
}
