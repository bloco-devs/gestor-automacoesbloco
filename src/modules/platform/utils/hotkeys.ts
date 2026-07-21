/**
 * Parser e matcher simples de hotkeys.
 * Formato: "mod+k", "mod+shift+n", "esc", "shift+/".
 * "mod" mapeia para Meta em macOS e Ctrl no restante.
 */

export interface ParsedHotkey {
  key: string;
  mod: boolean; // ctrl OR meta
  shift: boolean;
  alt: boolean;
}

export function parseHotkey(combo: string): ParsedHotkey {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  const out: ParsedHotkey = { key: "", mod: false, shift: false, alt: false };
  for (const p of parts) {
    if (p === "mod" || p === "ctrl" || p === "cmd" || p === "meta") out.mod = true;
    else if (p === "shift") out.shift = true;
    else if (p === "alt" || p === "option") out.alt = true;
    else out.key = p;
  }
  return out;
}

export function matchesEvent(combo: string, e: KeyboardEvent): boolean {
  const p = parseHotkey(combo);
  const key = e.key.toLowerCase();
  const modOk = p.mod ? e.metaKey || e.ctrlKey : !e.metaKey && !e.ctrlKey;
  const shiftOk = p.shift ? e.shiftKey : !e.shiftKey;
  const altOk = p.alt ? e.altKey : !e.altKey;
  return modOk && shiftOk && altOk && key === p.key;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function formatHotkey(combo: string): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return combo
    .split("+")
    .map((p) => {
      const k = p.toLowerCase();
      if (k === "mod") return isMac ? "⌘" : "Ctrl";
      if (k === "shift") return isMac ? "⇧" : "Shift";
      if (k === "alt") return isMac ? "⌥" : "Alt";
      if (k === "enter") return "↵";
      if (k === "esc" || k === "escape") return "Esc";
      return k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1);
    })
    .join(isMac ? "" : "+");
}
