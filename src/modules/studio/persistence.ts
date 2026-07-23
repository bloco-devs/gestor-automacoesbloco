/**
 * Studio Persistence — localStorage apenas. Sem banco.
 */
import type { StudioDocument } from "./types";

const KEY = "studio.v1.doc";

export function loadDoc(): StudioDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDocument;
    if (!parsed?.root?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDoc(doc: StudioDocument): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(doc));
  } catch {
    /* quota / privacidade — ignora silenciosamente */
  }
}

export function clearDoc(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
