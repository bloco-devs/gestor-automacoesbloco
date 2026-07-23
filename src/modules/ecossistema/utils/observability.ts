/**
 * Ecossistema — observabilidade client-side.
 *
 * Não cria nova infraestrutura de logs. Reutiliza:
 *  - `console` estruturado (namespace `ecossistema.*`) para o DevTools.
 *  - Ring buffer em `localStorage` (últimos 50 eventos) para painéis internos.
 *
 * Eventos padronizados:
 *   ecossistema.updated            — algo relevante mudou no ecossistema
 *   ecossistema.reprocessed        — reprocessar-matches concluiu com sucesso
 *   ecossistema.sync.success       — auto-sync executou sem erros
 *   ecossistema.sync.error         — auto-sync falhou (edge/rede)
 *   ecossistema.analytics.updated  — agregações recalculadas
 */

export type EcossistemaEvent =
  | "ecossistema.updated"
  | "ecossistema.reprocessed"
  | "ecossistema.sync.success"
  | "ecossistema.sync.error"
  | "ecossistema.analytics.updated";

export interface EcossistemaEventEntry {
  event: EcossistemaEvent;
  at: number;
  payload?: Record<string, unknown>;
}

const RING_KEY = "ecossistema.observability.v1";
const RING_LIMIT = 50;

function readRing(): EcossistemaEventEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EcossistemaEventEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRing(entries: EcossistemaEventEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RING_KEY, JSON.stringify(entries.slice(-RING_LIMIT)));
  } catch {
    /* quota — silencioso */
  }
}

export function logEcossistemaEvent(
  event: EcossistemaEvent,
  payload?: Record<string, unknown>,
): void {
  const entry: EcossistemaEventEntry = { event, at: Date.now(), payload };
  // Console estruturado (reaproveita o pipeline de logs existente)
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.info(`[${event}]`, payload ?? {});
  }
  const ring = readRing();
  ring.push(entry);
  writeRing(ring);
}

export function readEcossistemaEvents(): EcossistemaEventEntry[] {
  return readRing();
}

export function readLastEcossistemaEvent(
  event: EcossistemaEvent,
): EcossistemaEventEntry | null {
  const ring = readRing();
  for (let i = ring.length - 1; i >= 0; i -= 1) {
    if (ring[i].event === event) return ring[i];
  }
  return null;
}
