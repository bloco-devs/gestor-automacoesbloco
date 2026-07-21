import { useEffect } from "react";
import { isEditableTarget, matchesEvent } from "../utils/hotkeys";

export interface HotkeyBinding {
  combo: string;
  handler: (e: KeyboardEvent) => void;
  /** Ignora quando o foco está em campo editável. Default: true. */
  ignoreInEditable?: boolean;
  /** Executa mesmo se preventDefault já foi chamado. Default: false. */
  allowIfDefaultPrevented?: boolean;
}

/** Hook global de atalhos. Registra uma lista de bindings. */
export function useHotkeys(bindings: HotkeyBinding[]): void {
  useEffect(() => {
    if (!bindings.length) return;
    const onKey = (e: KeyboardEvent) => {
      for (const b of bindings) {
        if (!b.allowIfDefaultPrevented && e.defaultPrevented) continue;
        const ignoreEditable = b.ignoreInEditable !== false;
        if (ignoreEditable && isEditableTarget(e.target)) {
          // Exceção: Escape sempre passa
          if (e.key !== "Escape") continue;
        }
        if (matchesEvent(b.combo, e)) {
          e.preventDefault();
          b.handler(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bindings]);
}
