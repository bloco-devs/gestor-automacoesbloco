import { useMemo } from "react";
import { useHotkeys, type HotkeyBinding } from "../hotkeys/useHotkeys";

export interface DemandQuickActionHandlers {
  onAssign?: () => void;
  onPriority?: () => void;
  onStatus?: () => void;
  onComment?: () => void;
  onWorkflow?: () => void;
  onKnowledge?: () => void;
  onRouting?: () => void;
}

/**
 * Atalhos rápidos quando uma demanda está selecionada.
 * As teclas (a/p/s/c/w/k/r) só disparam fora de campos editáveis.
 */
export function useDemandQuickActions(enabled: boolean, h: DemandQuickActionHandlers) {
  const bindings = useMemo<HotkeyBinding[]>(() => {
    if (!enabled) return [];
    const b: HotkeyBinding[] = [];
    const add = (combo: string, fn?: () => void) => {
      if (fn) b.push({ combo, handler: fn });
    };
    add("a", h.onAssign);
    add("p", h.onPriority);
    add("s", h.onStatus);
    add("c", h.onComment);
    add("w", h.onWorkflow);
    add("k", h.onKnowledge);
    add("r", h.onRouting);
    return b;
  }, [enabled, h]);
  useHotkeys(bindings);
}
