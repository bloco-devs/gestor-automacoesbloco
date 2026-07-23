/**
 * Reprocessador do Ecossistema — invoca a edge `reprocessar-matches` existente
 * com debounce inteligente. Evita picos quando várias mudanças relevantes
 * acontecem em janela curta (novos sistemas, novas soluções, novas demandas
 * vinculadas, novos artigos, etc.).
 *
 * Não cria nova edge function. Não persiste estado em banco.
 */
import { supabase } from "@/integrations/supabase/client";
import { logEcossistemaEvent } from "../utils/observability";

const DEBOUNCE_MS = 30_000; // 30s: agrupa rajadas curtas
const COOLDOWN_MS = 5 * 60_000; // 5min: nunca reroda mais frequente que isso
const REASONS_LIMIT = 8;

interface Pending {
  timer: ReturnType<typeof setTimeout> | null;
  inflight: Promise<void> | null;
  lastRunAt: number;
  reasons: string[];
}

const state: Pending = {
  timer: null,
  inflight: null,
  lastRunAt: 0,
  reasons: [],
};

async function executar(): Promise<void> {
  const reasonsSnapshot = state.reasons.slice(-REASONS_LIMIT);
  state.reasons = [];
  const startedAt = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke("reprocessar-matches");
    if (error) throw error;
    state.lastRunAt = Date.now();
    logEcossistemaEvent("ecossistema.reprocessed", {
      processadas: (data as { processadas?: number } | null)?.processadas ?? 0,
      total_pendentes: (data as { total_pendentes?: number } | null)?.total_pendentes ?? 0,
      lote: (data as { lote?: number } | null)?.lote ?? 0,
      duration_ms: Date.now() - startedAt,
      reasons: reasonsSnapshot,
    });
    logEcossistemaEvent("ecossistema.sync.success", { at: state.lastRunAt });
  } catch (err) {
    logEcossistemaEvent("ecossistema.sync.error", {
      message: err instanceof Error ? err.message : String(err),
      reasons: reasonsSnapshot,
    });
  }
}

/**
 * Agenda um reprocessamento. Chamadas concorrentes são agrupadas.
 *
 * @param reason motivo textual curto (ex: "solicitacao.insert", "solucao.update")
 */
export function scheduleReprocessarMatches(reason: string): void {
  state.reasons.push(reason);
  logEcossistemaEvent("ecossistema.updated", { reason });

  // Cooldown: se rodou há pouco, atrasa até o fim do cooldown
  const sinceLast = Date.now() - state.lastRunAt;
  const delay = sinceLast < COOLDOWN_MS ? Math.max(DEBOUNCE_MS, COOLDOWN_MS - sinceLast) : DEBOUNCE_MS;

  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    if (state.inflight) return; // já em execução, próxima janela cobre
    state.inflight = executar().finally(() => {
      state.inflight = null;
    });
  }, delay);
}

export function cancelPendingReprocessamentos(): void {
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
}

/** Somente para testes/observabilidade. */
export function _reprocessadorState(): Readonly<Pending> {
  return state;
}
