/**
 * Selectors puros derivam contagens, insights e listas a partir dos itens já rankeados.
 */
import type {
  InboxInsight,
  InboxItem,
  InboxSummaryCounts,
  RankedInboxItem,
} from "../types";
import type { PipelineStatus } from "@/lib/types";

const CRITICAL_SCORE = 300;
const STALE_DAYS_ALERT = 6;

export function isDoneToday(item: InboxItem, now = Date.now()): boolean {
  if (item.status !== ("entregue" as PipelineStatus)) return false;
  const t = new Date(item.updatedAt).getTime();
  if (!Number.isFinite(t)) return false;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return t >= d.getTime();
}

export function selectSummary(items: RankedInboxItem[], now = Date.now()): InboxSummaryCounts {
  let critical = 0;
  let inProgress = 0;
  let waitingQa = 0;
  let doneToday = 0;
  for (const it of items) {
    if (it.status === ("qa" as PipelineStatus)) waitingQa += 1;
    else if (it.status === ("desenvolvimento" as PipelineStatus)) inProgress += 1;
    if (isDoneToday(it, now)) doneToday += 1;
    if (it.score >= CRITICAL_SCORE && it.status !== ("entregue" as PipelineStatus)) critical += 1;
  }
  return { critical, inProgress, waitingQa, doneToday, total: items.length };
}

export function selectPriorityItem(items: RankedInboxItem[]): RankedInboxItem | null {
  const actionable = items.filter(
    (i) =>
      i.status !== ("entregue" as PipelineStatus) &&
      i.status !== ("cancelado" as PipelineStatus),
  );
  return actionable[0] ?? null;
}

export function selectMyTasks(
  items: RankedInboxItem[],
  currentUserId: string | null,
  limit = 20,
): RankedInboxItem[] {
  const mine = items.filter(
    (i) =>
      i.status !== ("entregue" as PipelineStatus) &&
      i.status !== ("cancelado" as PipelineStatus) &&
      (i.responsibleId === currentUserId || i.requesterId === currentUserId),
  );
  return mine.slice(0, limit);
}

export function selectInsights(items: RankedInboxItem[]): InboxInsight[] {
  const insights: InboxInsight[] = [];
  const qa = items.filter((i) => i.status === ("qa" as PipelineStatus)).length;
  if (qa > 0) {
    insights.push({
      id: "qa-count",
      kind: qa >= 3 ? "warning" : "info",
      message: `Você possui ${qa} ${qa === 1 ? "item aguardando" : "itens aguardando"} QA.`,
    });
  }

  const stale = items
    .filter((i) => i.ageDays >= STALE_DAYS_ALERT && i.status !== ("entregue" as PipelineStatus))
    .sort((a, b) => b.ageDays - a.ageDays)[0];
  if (stale) {
    insights.push({
      id: `stale-${stale.id}`,
      kind: "warning",
      message: `O card "${truncate(stale.title, 40)}" está parado há ${Math.floor(stale.ageDays)} dias.`,
    });
  }

  const highPri = items.filter((i) => i.priority >= 70 && i.status !== ("entregue" as PipelineStatus)).length;
  if (highPri > 0) {
    insights.push({
      id: "high-pri",
      kind: "info",
      message: `Existem ${highPri} ${highPri === 1 ? "tarefa" : "tarefas"} com prioridade Alta.`,
    });
  }

  const doneToday = items.filter((i) => isDoneToday(i)).length;
  if (doneToday > 0) {
    insights.push({
      id: "done-today",
      kind: "success",
      message: `Você concluiu ${doneToday} ${doneToday === 1 ? "item" : "itens"} hoje.`,
    });
  }

  return insights;
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
