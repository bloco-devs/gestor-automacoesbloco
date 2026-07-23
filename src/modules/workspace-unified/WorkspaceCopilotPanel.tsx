import { Sparkles } from "lucide-react";

/**
 * Painel Copilot lateral (FEATURE 026.3).
 * Camada leve, sempre disponível. Nunca substitui uma página.
 * Placeholder mínimo: hosts que expõem contexto podem trocar por
 * componentes existentes (IntelligencePanel, CopilotDock etc.) via slot.
 */
export function WorkspaceCopilotPanel() {
  return (
    <aside
      aria-label="Copilot"
      className="flex h-full min-h-0 w-full flex-col gap-3 overflow-y-auto border-l border-border bg-card/40 p-3"
    >
      <header className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden />
        Copilot
      </header>
      <p className="text-xs text-muted-foreground">
        Resumo, contexto, conhecimento e próximas ações da demanda ativa.
      </p>
      <div className="rounded-lg border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
        Selecione uma demanda para o Copilot resumir contexto, riscos e sugerir próximas ações.
      </div>
    </aside>
  );
}
