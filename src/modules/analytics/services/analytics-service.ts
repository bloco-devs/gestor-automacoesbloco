/**
 * Analytics Service — agregações puras sobre dados já carregados.
 *
 * NÃO faz I/O direto: recebe listas já buscadas pelos hooks. Isso permite:
 *   - reaproveitar caches do React Query
 *   - testar 100% em memória
 *   - garantir zero regressão em serviços existentes
 */
import type { Demand, DemandPriority } from "@/modules/demands/types";
import type { UserWorkload } from "@/modules/demands/service";
import type { WorkflowLogRow } from "@/modules/workflow-runtime/service";
import type { WorkflowDefinition } from "@/modules/workflow-builder/types";
import type { UserProfileLite } from "@/modules/demands/types";
import type { IaUsageRow } from "@/lib/iaUsage";
import { aggregateIaUsage } from "@/lib/iaUsage";
import type {
  AiStats,
  AnalyticsFilters,
  AnalyticsPeriod,
  DevRow,
  KnowledgeStats,
  RoutingStats,
  SlaStats,
  SystemRow,
  TrendPoint,
  WorkflowStats,
} from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const PERIOD_DAYS: Record<AnalyticsPeriod, number> = { "7d": 7, "30d": 30, "90d": 90 };

export function periodSinceIso(period: AnalyticsPeriod, now = Date.now()): string {
  return new Date(now - PERIOD_DAYS[period] * DAY_MS).toISOString();
}

export function applyFilters(demands: Demand[], f: AnalyticsFilters, now = Date.now()): Demand[] {
  const since = now - PERIOD_DAYS[f.period] * DAY_MS;
  return demands.filter((d) => {
    // período: consideramos demandas criadas OU atualizadas no período.
    const created = new Date(d.created_at).getTime();
    const updated = new Date(d.updated_at).getTime();
    if (Number.isFinite(created) && Number.isFinite(updated)) {
      if (created < since && updated < since) return false;
    }
    if (f.systemId && d.system_id !== f.systemId) return false;
    if (f.assignedTo && d.assigned_to !== f.assignedTo) return false;
    if (f.priority && d.priority !== f.priority) return false;
    if (f.type && d.type !== f.type) return false;
    if (f.status && d.status !== f.status) return false;
    return true;
  });
}

/* ---------- Tendência (linha temporal) ---------- */

export function buildTrend(demands: Demand[], period: AnalyticsPeriod, now = Date.now()): TrendPoint[] {
  const days = PERIOD_DAYS[period];
  const start = new Date(now - (days - 1) * DAY_MS);
  start.setHours(0, 0, 0, 0);

  const buckets = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, criadas: 0, concluidas: 0, backlog: 0 });
  }

  for (const d of demands) {
    const createdKey = d.created_at?.slice(0, 10);
    if (createdKey && buckets.has(createdKey)) {
      buckets.get(createdKey)!.criadas += 1;
    }
    if (d.status === "concluido") {
      const closedKey = d.updated_at?.slice(0, 10);
      if (closedKey && buckets.has(closedKey)) {
        buckets.get(closedKey)!.concluidas += 1;
      }
    }
  }

  // Backlog acumulado (aberto até o final do dia).
  const ordered = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
  for (const point of ordered) {
    const cutoff = new Date(point.date + "T23:59:59Z").getTime();
    let open = 0;
    for (const d of demands) {
      const created = new Date(d.created_at).getTime();
      if (!Number.isFinite(created) || created > cutoff) continue;
      if (d.status === "concluido") {
        const closed = new Date(d.updated_at).getTime();
        if (Number.isFinite(closed) && closed <= cutoff) continue;
      }
      open += 1;
    }
    point.backlog = open;
  }
  return ordered;
}

/* ---------- Produtividade da equipe ---------- */

export function buildDevRows(
  demands: Demand[],
  workloads: UserWorkload[],
  profiles: Map<string, UserProfileLite>,
): DevRow[] {
  const ids = new Set<string>();
  for (const w of workloads) ids.add(w.user_id);
  for (const d of demands) if (d.assigned_to) ids.add(d.assigned_to);

  const workloadMap = new Map(workloads.map((w) => [w.user_id, w]));

  const rows: DevRow[] = [];
  for (const uid of ids) {
    const own = demands.filter((d) => d.assigned_to === uid);
    const concluidas = own.filter((d) => d.status === "concluido");
    const backlogAtual = own.filter((d) => d.status !== "concluido").length;

    let somaHoras = 0;
    let cont = 0;
    for (const d of concluidas) {
      const created = new Date(d.created_at).getTime();
      const finished = new Date(d.updated_at).getTime();
      if (Number.isFinite(created) && Number.isFinite(finished) && finished > created) {
        somaHoras += (finished - created) / HOUR_MS;
        cont += 1;
      }
    }
    const tempoMedioHoras = cont ? somaHoras / cont : null;

    const slaTotais = concluidas.length;
    const slaCumpridas = concluidas.filter(
      (d) => d.sla_status === "cumprido" || d.sla_status === "no_prazo",
    ).length;
    const slaCumprimentoPct = slaTotais ? (slaCumpridas / slaTotais) * 100 : null;

    const prof = profiles.get(uid);
    const wl = workloadMap.get(uid);
    rows.push({
      user_id: uid,
      nome: prof?.nome ?? wl?.nome ?? null,
      email: prof?.email ?? wl?.email ?? null,
      avatar_url: prof?.avatar_url ?? wl?.avatar_url ?? null,
      concluidas: concluidas.length,
      backlogAtual,
      tempoMedioHoras,
      slaCumprimentoPct,
      workload: wl?.active_count ?? backlogAtual,
    });
  }
  return rows.sort((a, b) => b.concluidas - a.concluidas || a.backlogAtual - b.backlogAtual);
}

/* ---------- Sistemas ---------- */

export function buildSystemRows(
  demands: Demand[],
  plataformas: Array<{ id: string; nome: string }>,
): SystemRow[] {
  const nameById = new Map(plataformas.map((p) => [p.id, p.nome]));
  const acc = new Map<string, SystemRow>();

  for (const d of demands) {
    const id = d.system_id;
    const key = id ?? "__none__";
    if (!acc.has(key)) {
      acc.set(key, {
        id,
        nome: id ? nameById.get(id) ?? "Sistema" : "Sem sistema",
        bugs: 0,
        melhorias: 0,
        automacoes: 0,
        backlog: 0,
        slaCumprimentoPct: null,
      });
    }
    const row = acc.get(key)!;
    if (d.type === "bug") row.bugs += 1;
    if (d.type === "melhoria") row.melhorias += 1;
    if (d.type === "automacao") row.automacoes += 1;
    if (d.status !== "concluido") row.backlog += 1;
  }

  for (const row of acc.values()) {
    const closed = demands.filter(
      (d) => (d.system_id ?? null) === row.id && d.status === "concluido",
    );
    if (closed.length > 0) {
      const ok = closed.filter(
        (d) => d.sla_status === "cumprido" || d.sla_status === "no_prazo",
      ).length;
      row.slaCumprimentoPct = (ok / closed.length) * 100;
    }
  }

  return Array.from(acc.values()).sort(
    (a, b) => b.bugs + b.melhorias + b.automacoes - (a.bugs + a.melhorias + a.automacoes),
  );
}

/* ---------- Workflow ---------- */

export function buildWorkflowStats(
  logs: WorkflowLogRow[],
  defs: WorkflowDefinition[],
): WorkflowStats {
  const ativos = defs.filter((d) => d.enabled).length;
  let sucesso = 0;
  let falhas = 0;
  let somaMs = 0;
  let contMs = 0;
  for (const l of logs) {
    const s = (l.status || "").toLowerCase();
    if (s === "success" || s === "sucesso" || s === "ok") sucesso += 1;
    else falhas += 1;
    if (typeof l.duration_ms === "number" && l.duration_ms > 0) {
      somaMs += l.duration_ms;
      contMs += 1;
    }
  }
  return {
    ativos,
    totalDefinicoes: defs.length,
    execucoes: logs.length,
    sucesso,
    falhas,
    duracaoMediaMs: contMs ? somaMs / contMs : null,
    // Cada execução de sucesso substitui, em média, ~2 min de trabalho manual.
    economiaEstimadaMin: sucesso * 2,
  };
}

/* ---------- Knowledge ---------- */

export function buildKnowledgeStats(input: {
  publicados: number;
  articles: Array<{ id: string; titulo: string; views: number | null }>;
  feedback: Array<{ resolved: boolean | null; article_id: string | null }>;
}): KnowledgeStats {
  const totalFeedback = input.feedback.length;
  const deflexao = input.feedback.filter((f) => f.resolved === true).length;
  const taxaResolucaoPct = totalFeedback ? (deflexao / totalFeedback) * 100 : 0;
  const topArtigos = [...input.articles]
    .map((a) => ({ id: a.id, titulo: a.titulo, views: Number(a.views ?? 0) }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  return { publicados: input.publicados, totalFeedback, deflexao, taxaResolucaoPct, topArtigos };
}

/* ---------- IA ---------- */

export function buildAiStats(rows: IaUsageRow[]): AiStats {
  const agg = aggregateIaUsage(rows);
  return {
    totalCalls: agg.totalCalls,
    errorRate: agg.errorRate,
    totalTokensIn: agg.totalTokensIn,
    totalTokensOut: agg.totalTokensOut,
    byAcao: agg.byAcao.slice(0, 8).map(({ key, count }) => ({ key, count })),
    byModelo: agg.byModelo.slice(0, 6).map(({ key, count }) => ({ key, count })),
  };
}

/* ---------- SLA ---------- */

export function buildSlaStats(demands: Demand[]): SlaStats {
  const closed = demands.filter((d) => d.status === "concluido");
  const cumpridas = closed.filter(
    (d) => d.sla_status === "cumprido" || d.sla_status === "no_prazo",
  ).length;
  const violadas = closed.filter((d) => d.sla_status === "estourado").length;
  const totalAvaliavel = cumpridas + violadas;
  const cumprimentoPct = totalAvaliavel ? (cumpridas / totalAvaliavel) * 100 : null;

  let somaHoras = 0;
  let cont = 0;
  for (const d of closed) {
    const created = new Date(d.created_at).getTime();
    const finished = new Date(d.updated_at).getTime();
    if (Number.isFinite(created) && Number.isFinite(finished) && finished > created) {
      somaHoras += (finished - created) / HOUR_MS;
      cont += 1;
    }
  }
  const tempoMedioHoras = cont ? somaHoras / cont : null;

  const priorities: DemandPriority[] = ["baixa", "media", "alta", "critica"];
  const porPrioridade = priorities.map((priority) => {
    const list = closed.filter((d) => d.priority === priority);
    if (list.length === 0) return { priority, cumprimentoPct: null, total: 0 };
    const ok = list.filter(
      (d) => d.sla_status === "cumprido" || d.sla_status === "no_prazo",
    ).length;
    return { priority, cumprimentoPct: (ok / list.length) * 100, total: list.length };
  });

  return { cumpridas, violadas, cumprimentoPct, tempoMedioHoras, porPrioridade };
}

/* ---------- Routing ---------- */

export function buildRoutingStats(
  workloads: UserWorkload[],
  candidates: Array<{ user_id: string; nome: string | null; active_count: number }>,
): RoutingStats {
  const distribuicao = workloads
    .map((w) => ({ user_id: w.user_id, nome: w.nome, carga: w.active_count }))
    .sort((a, b) => b.carga - a.carga)
    .slice(0, 12);
  const ativos = workloads.filter((w) => w.active_count > 0).length;
  const cargaTotal = workloads.reduce((acc, w) => acc + w.active_count, 0);
  const cargaMedia = workloads.length ? cargaTotal / workloads.length : 0;
  const cargaMax = workloads.reduce((m, w) => Math.max(m, w.active_count), 0);
  return {
    candidatos: candidates.length,
    ativos,
    cargaMedia,
    cargaMax,
    distribuicao,
  };
}
