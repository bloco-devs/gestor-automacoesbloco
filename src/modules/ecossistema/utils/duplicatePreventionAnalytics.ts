/**
 * Analytics client-side (localStorage) para eventos de prevenção de duplicatas.
 * Não cria tabelas nem edge functions — apenas grava contadores locais que o
 * Operations pode consumir via `readDuplicatePreventionMetrics()`.
 */

export type DuplicatePreventionEvent =
  | "duplicate_prevention_view"
  | "duplicate_prevention_continue"
  | "duplicate_prevention_open_article"
  | "duplicate_prevention_open_ticket"
  | "duplicate_prevention_open_system";

const STORAGE_KEY = "ecossistema.duplicate-prevention.v1";
const IGNORED_KEY = "ecossistema.ignored-suggestion.v1";

interface Store {
  events: Record<DuplicatePreventionEvent, number>;
  updatedAt: number;
}

function readStore(): Store {
  if (typeof window === "undefined") {
    return {
      events: {
        duplicate_prevention_view: 0,
        duplicate_prevention_continue: 0,
        duplicate_prevention_open_article: 0,
        duplicate_prevention_open_ticket: 0,
        duplicate_prevention_open_system: 0,
      },
      updatedAt: 0,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    return JSON.parse(raw) as Store;
  } catch {
    return {
      events: {
        duplicate_prevention_view: 0,
        duplicate_prevention_continue: 0,
        duplicate_prevention_open_article: 0,
        duplicate_prevention_open_ticket: 0,
        duplicate_prevention_open_system: 0,
      },
      updatedAt: 0,
    };
  }
}

export function trackDuplicatePrevention(event: DuplicatePreventionEvent): void {
  if (typeof window === "undefined") return;
  const s = readStore();
  s.events[event] = (s.events[event] ?? 0) + 1;
  s.updatedAt = Date.now();
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota exceeded — silencioso */
  }
}

export function readDuplicatePreventionMetrics() {
  const s = readStore();
  const evitadas = s.events.duplicate_prevention_open_article +
    s.events.duplicate_prevention_open_ticket +
    s.events.duplicate_prevention_open_system;
  const total = s.events.duplicate_prevention_view;
  return {
    events: s.events,
    demandasEvitadas: evitadas,
    totalVisualizacoes: total,
    taxaDeflexao: total > 0 ? Math.round((evitadas / total) * 100) : 0,
    updatedAt: s.updatedAt,
  };
}

/** Marca uma demanda como criada após ignorar a sugestão do ecossistema. */
export function markDemandIgnoredSuggestion(demandId: string): void {
  if (typeof window === "undefined" || !demandId) return;
  try {
    const raw = window.localStorage.getItem(IGNORED_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[demandId] = Date.now();
    window.localStorage.setItem(IGNORED_KEY, JSON.stringify(map));
  } catch {
    /* silencioso */
  }
}

export function hasIgnoredSuggestion(demandId: string): boolean {
  if (typeof window === "undefined" || !demandId) return false;
  try {
    const raw = window.localStorage.getItem(IGNORED_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, number>;
    return Boolean(map[demandId]);
  } catch {
    return false;
  }
}
