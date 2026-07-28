import { Sparkles } from "lucide-react";
import { emitCopilotEvent } from "../events";

/**
 * Floating Button do Copilot — renderizado por hosts que consumam
 * o extension point "workspace" via useExtensionPoint().
 * O core NÃO consome; a UI existe apenas via SDK.
 */
export default function CopilotFloatingButton() {
  return (
    <button
      type="button"
      onClick={() =>
        emitCopilotEvent("copilot.opened", { at: Date.now(), source: "floating" })
      }
      className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs shadow-sm hover:bg-accent"
      aria-label="Abrir AI Copilot"
    >
      <Sparkles className="size-3.5" aria-hidden />
      Copilot
    </button>
  );
}
