/**
 * F018.4 — Afinidade por sistema (aditivo, nunca substitui o score base).
 *
 * `scoreSystemFit` retorna 0..10 pontos que são SOMADOS ao score base do ranker.
 * Sem side-effects, sem I/O.
 */
import type { Candidate, DemandInput, SystemHistoryEntry } from "../types";

/** Ganho máximo do fator sistema. Somado ao score 0..100 do ranker. */
export const SYSTEM_FIT_MAX_BONUS = 10;

interface SystemFitPieces {
  quantity: number; // 0..1 — saturating em 10 demandas
  success: number; // 0..1 — success/total
  speed: number; // 0..1 — 1 se <=4h, 0 se >=48h
  documentation: number; // 0..1 — saturating em 5 artigos
}

const W = { quantity: 0.35, success: 0.3, speed: 0.2, documentation: 0.15 } as const;

/** Localiza histórico específico do sistema da demanda. */
export function findSystemEntry(
  demand: Pick<DemandInput, "system_slug">,
  c: Pick<Candidate, "system_history">,
): SystemHistoryEntry | null {
  if (!demand.system_slug) return null;
  const list = c.system_history ?? [];
  for (const e of list) if (e.slug === demand.system_slug) return e;
  return null;
}

function normalizeSpeed(avgH: number | null | undefined): number {
  if (avgH == null || !Number.isFinite(avgH) || avgH <= 0) return 0.5;
  if (avgH <= 4) return 1;
  if (avgH >= 48) return 0;
  return 1 - (avgH - 4) / 44;
}

/** Detalha as parcelas — útil para UI e testes. */
export function scoreSystemFitBreakdown(entry: SystemHistoryEntry | null): SystemFitPieces & {
  raw: number;
  bonus: number;
} {
  if (!entry) return { quantity: 0, success: 0, speed: 0, documentation: 0, raw: 0, bonus: 0 };
  const quantity = Math.max(0, Math.min(1, entry.total / 10));
  const success = entry.total > 0 ? Math.max(0, Math.min(1, entry.success / entry.total)) : 0;
  const speed = normalizeSpeed(entry.avg_resolution_h);
  const documentation = Math.max(0, Math.min(1, (entry.documentation ?? 0) / 5));
  const raw =
    quantity * W.quantity + success * W.success + speed * W.speed + documentation * W.documentation;
  const bonus = Math.round(raw * SYSTEM_FIT_MAX_BONUS * 10) / 10;
  return { quantity, success, speed, documentation, raw, bonus };
}

/**
 * Bônus aditivo ao score base. Retorna 0 quando não há sistema informado
 * na demanda ou candidato não tem histórico naquele sistema — preservando
 * 100% do comportamento atual em fluxos sem sistema relacionado.
 */
export function scoreSystemFit(demand: DemandInput, c: Candidate): number {
  const entry = findSystemEntry(demand, c);
  if (!entry) return 0;
  return scoreSystemFitBreakdown(entry).bonus;
}

/** Percentual 0..100 exibido em UI (barra de afinidade). */
export function systemAffinityPercent(entry: SystemHistoryEntry | null): number {
  if (!entry) return 0;
  const { raw } = scoreSystemFitBreakdown(entry);
  return Math.round(raw * 100);
}
