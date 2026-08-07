/**
 * Priority Engine — cálculo local (client-side) de prioridade da Inbox.
 *
 * Não altera nada no backend. Apenas rankeia itens já carregados usando
 * regras heurísticas que combinam:
 *   • prioridade nominal do item (score final 0-100)
 *   • idade / tempo parado
 *   • proximidade de SLA (quando existir)
 *   • status atual (críticos pesam mais)
 *   • se o usuário é o responsável
 */
import { ordenarPorOrdemManual } from "@/modules/workspace-demandas/ordenacao";
import type { InboxItem, RankedInboxItem } from "../types";
import type { PipelineStatus } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_WEIGHT: Record<PipelineStatus, number> = {
  triagem: 40,
  aprovacao: 55,
  desenvolvimento: 65,
  qa: 50,
  entregue: 5,
  cancelado: 0,
  // fallback: PipelineStatus pode ter valores extras entre versões — o cast abaixo cobre.
} as unknown as Record<PipelineStatus, number>;

export function statusWeight(status: PipelineStatus): number {
  return STATUS_WEIGHT[status] ?? 30;
}

export function daysBetween(fromIso: string, nowMs = Date.now()): number {
  const t = new Date(fromIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, (nowMs - t) / DAY_MS);
}

export interface RankOptions {
  currentUserId?: string | null;
  now?: number;
}

/**
 * Calcula o score de priorização (0-1000) e a lista de razões para um item.
 * Fórmula: base(priority) + status + idade + SLA + responsável.
 */
export function scoreItem(item: InboxItem, options: RankOptions = {}): RankedInboxItem {
  const now = options.now ?? Date.now();
  const ageDays = daysBetween(item.updatedAt, now);
  const reasons: string[] = [];

  let score = 0;

  // 1) Prioridade nominal (0-100) → peso 4
  const priorityComp = Math.max(0, Math.min(100, item.priority)) * 4;
  score += priorityComp;
  if (item.priority >= 70) reasons.push(`Prioridade alta (${item.priority.toFixed(0)})`);

  // 2) Status
  const sw = statusWeight(item.status);
  score += sw;
  if (sw >= 55) reasons.push(`Status "${item.status}"`);

  // 3) Tempo parado — cresce até 200
  const stalePts = Math.min(200, ageDays * 15);
  score += stalePts;
  if (ageDays >= 5) reasons.push(`Parado há ${Math.floor(ageDays)}d`);

  // 4) SLA — quanto mais próximo/vencido, maior o peso
  if (item.sla) {
    const slaMs = new Date(item.sla).getTime();
    if (Number.isFinite(slaMs)) {
      const remaining = (slaMs - now) / DAY_MS;
      if (remaining < 0) {
        score += 250;
        reasons.push(`SLA vencido (${Math.abs(Math.floor(remaining))}d)`);
      } else if (remaining <= 2) {
        score += 150;
        reasons.push(`SLA em ${Math.ceil(remaining)}d`);
      } else if (remaining <= 5) {
        score += 60;
      }
    }
  }

  // 5) Responsável = usuário atual
  if (options.currentUserId && item.responsibleId && item.responsibleId === options.currentUserId) {
    score += 60;
    reasons.push("Atribuído a você");
  }

  // 6) Concluídos hoje / cancelados vão para o fim
  if (item.status === ("entregue" as PipelineStatus) || item.status === ("cancelado" as PipelineStatus)) {
    score = Math.min(score, 30);
  }

  return { ...item, score: Math.round(score), reasons, ageDays };
}

/**
 * A fila da Caixa de Entrada.
 *
 * O score continua sendo calculado e mostrado — ele é a explicação. O que muda
 * é a precedência: quem foi arrastado à mão fica onde a pessoa colocou, e o
 * score volta a mandar apenas entre os itens que ninguém tocou.
 */
export function rankInbox(items: InboxItem[], options: RankOptions = {}): RankedInboxItem[] {
  const pontuados = items.map((it) => scoreItem(it, options));
  return ordenarPorOrdemManual(
    pontuados,
    (it) => it.ordemManual,
    (a, b) => b.score - a.score,
  );
}

/**
 * Ponto de extensão para IA futura (Task 007+). Não implementado.
 */
export function futureRecommendations(): null {
  return null;
}
