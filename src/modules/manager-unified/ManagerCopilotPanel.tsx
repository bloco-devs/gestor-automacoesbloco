import { Sparkles } from "lucide-react";

/**
 * Painel Copilot lateral da Gestão (FEATURE 026.4).
 * Sempre disponível, nunca é uma página.
 */
export function ManagerCopilotPanel() {
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
        Resumo do panorama, riscos e próximas ações recomendadas.
      </p>
      <div className="rounded-lg border border-dashed border-border bg-background/60 p-3 text-xs text-muted-foreground">
        Selecione uma demanda ou pessoa para o Copilot explicar contexto e sugerir ações.
      </div>
    </aside>
  );
}
