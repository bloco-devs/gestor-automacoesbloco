/**
 * F018.5 — Analytics de Afinidade do Ecossistema.
 *
 * Utilitários puros: recebem um `Candidate[]` (do CandidatePool) e devolvem
 * agregações prontas para renderização. Nenhum I/O, nenhum React.
 *
 * Reutiliza `scoreSystemFitBreakdown` / `systemAffinityPercent` — não redefine
 * matemática de afinidade.
 */
import type { Candidate, SystemHistoryEntry } from "@/modules/routing/types";
import {
  scoreSystemFitBreakdown,
  systemAffinityPercent,
} from "@/modules/routing/engine/system-fit";

export interface CellDatum {
  userId: string;
  slug: string;
  affinity: number; // 0..100
  entry: SystemHistoryEntry;
}

export interface HeatmapData {
  systems: string[]; // ordenado por total de demandas desc
  devs: Candidate[]; // ordenado por afinidade média desc
  cell: (userId: string, slug: string) => CellDatum | null;
  maxAffinity: number;
  isEmpty: boolean;
}

export interface RankedDev {
  candidate: Candidate;
  affinity: number;
  entry: SystemHistoryEntry;
  isSpecialist: boolean; // afinidade >= 60
}

export type Coverage = {
  zero: string[];
  one: string[];
  twoPlus: string[];
  totalSystems: number;
  pctCovered: number; // (>=1 especialista) / total
};

export type RiskSeverity = "alta" | "media" | "baixa";
export interface Risk {
  slug: string;
  severity: RiskSeverity;
  reasons: string[];
  specialistCount: number;
  soleSpecialist: Candidate | null;
}

export interface Insight {
  id: string;
  slug: string;
  tone: "danger" | "warning" | "info" | "success";
  text: string;
}

const SPECIALIST_THRESHOLD = 60;
const LOW_AFFINITY_THRESHOLD = 30;

/**
 * Constrói a matriz Developer × Sistema para o heatmap.
 * Complexidade: O(sum(system_history)) ≤ O(devs · systems). Sem loops aninhados
 * redundantes — cada célula preenchida em um único passe.
 */
export function buildAffinityMatrix(pool: Candidate[]): HeatmapData {
  if (!pool || pool.length === 0) {
    return {
      systems: [],
      devs: [],
      cell: () => null,
      maxAffinity: 0,
      isEmpty: true,
    };
  }
  const systemTotals = new Map<string, number>();
  const cellIndex = new Map<string, CellDatum>();
  const devAffinity = new Map<string, { sum: number; count: number }>();
  let maxAffinity = 0;

  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const affinity = systemAffinityPercent(entry);
      cellIndex.set(`${dev.user_id}::${entry.slug}`, {
        userId: dev.user_id,
        slug: entry.slug,
        affinity,
        entry,
      });
      systemTotals.set(entry.slug, (systemTotals.get(entry.slug) ?? 0) + entry.total);
      const acc = devAffinity.get(dev.user_id) ?? { sum: 0, count: 0 };
      acc.sum += affinity;
      acc.count += 1;
      devAffinity.set(dev.user_id, acc);
      if (affinity > maxAffinity) maxAffinity = affinity;
    }
  }

  const systems = Array.from(systemTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);

  const devsWithData = pool.filter((d) => devAffinity.has(d.user_id));
  const devs = [...devsWithData].sort((a, b) => {
    const A = devAffinity.get(a.user_id) ?? { sum: 0, count: 0 };
    const B = devAffinity.get(b.user_id) ?? { sum: 0, count: 0 };
    const avgA = A.count ? A.sum / A.count : 0;
    const avgB = B.count ? B.sum / B.count : 0;
    if (avgA !== avgB) return avgB - avgA;
    return (a.nome ?? a.user_id).localeCompare(b.nome ?? b.user_id);
  });

  return {
    systems,
    devs,
    cell: (userId, slug) => cellIndex.get(`${userId}::${slug}`) ?? null,
    maxAffinity,
    isEmpty: systems.length === 0 || devs.length === 0,
  };
}

/** Top-N especialistas por sistema. Ordenado por afinidade desc. */
export function buildSystemRankings(
  pool: Candidate[],
  topN = 5,
): Map<string, RankedDev[]> {
  const bySlug = new Map<string, RankedDev[]>();
  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const affinity = systemAffinityPercent(entry);
      const list = bySlug.get(entry.slug) ?? [];
      list.push({
        candidate: dev,
        affinity,
        entry,
        isSpecialist: affinity >= SPECIALIST_THRESHOLD,
      });
      bySlug.set(entry.slug, list);
    }
  }
  for (const [slug, list] of bySlug) {
    list.sort((a, b) => {
      if (a.affinity !== b.affinity) return b.affinity - a.affinity;
      if (a.entry.total !== b.entry.total) return b.entry.total - a.entry.total;
      return (a.candidate.nome ?? "").localeCompare(b.candidate.nome ?? "");
    });
    bySlug.set(slug, list.slice(0, topN));
  }
  return bySlug;
}

/** Cobertura por número de especialistas por sistema (afinidade ≥ threshold). */
export function buildCoverage(pool: Candidate[]): Coverage {
  const counts = new Map<string, number>();
  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const affinity = systemAffinityPercent(entry);
      counts.set(
        entry.slug,
        (counts.get(entry.slug) ?? 0) + (affinity >= SPECIALIST_THRESHOLD ? 1 : 0),
      );
      // garante que o sistema apareça no denominador mesmo sem especialistas
      if (!counts.has(entry.slug)) counts.set(entry.slug, 0);
    }
  }
  const zero: string[] = [];
  const one: string[] = [];
  const twoPlus: string[] = [];
  for (const [slug, n] of counts) {
    if (n === 0) zero.push(slug);
    else if (n === 1) one.push(slug);
    else twoPlus.push(slug);
  }
  const totalSystems = counts.size;
  const covered = one.length + twoPlus.length;
  return {
    zero: zero.sort(),
    one: one.sort(),
    twoPlus: twoPlus.sort(),
    totalSystems,
    pctCovered: totalSystems > 0 ? Math.round((covered / totalSystems) * 100) : 0,
  };
}

/** Risco operacional por sistema. */
export function detectRisks(pool: Candidate[]): Risk[] {
  const perSystem = new Map<
    string,
    {
      specialists: Candidate[];
      totalDemands: number;
      totalDocs: number;
      soleActive: boolean;
    }
  >();

  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const affinity = systemAffinityPercent(entry);
      const acc = perSystem.get(entry.slug) ?? {
        specialists: [] as Candidate[],
        totalDemands: 0,
        totalDocs: 0,
        soleActive: false,
      };
      acc.totalDemands += entry.total;
      acc.totalDocs += entry.documentation ?? 0;
      if (affinity >= SPECIALIST_THRESHOLD) acc.specialists.push(dev);
      perSystem.set(entry.slug, acc);
    }
  }

  const risks: Risk[] = [];
  for (const [slug, v] of perSystem) {
    const reasons: string[] = [];
    let severity = "baixa" as RiskSeverity;

    if (v.specialists.length === 0) {
      reasons.push("Nenhum especialista com afinidade ≥ 60%");
      severity = "alta";
    } else if (v.specialists.length === 1) {
      reasons.push("Apenas um especialista (ponto único de falha)");
      if (severity !== "alta") severity = "media";
    }

    if (v.totalDocs === 0) {
      reasons.push("Sem documentação escrita");
      if (severity === "baixa") severity = "media";
    }

    const soleActive =
      v.specialists.length === 1 && v.specialists[0].active_count === 0;
    if (soleActive) {
      reasons.push("Único especialista sem carga ativa");
      severity = "alta";
    }

    if (reasons.length === 0) continue;
    risks.push({
      slug,
      severity,
      reasons,
      specialistCount: v.specialists.length,
      soleSpecialist: v.specialists.length === 1 ? v.specialists[0] : null,
    });
  }

  risks.sort((a, b) => {
    const rank = { alta: 3, media: 2, baixa: 1 } as const;
    return rank[b.severity] - rank[a.severity];
  });
  return risks;
}

/** Frases automáticas derivadas — sem IA, sem edge. */
export function buildInsights(pool: Candidate[]): Insight[] {
  const out: Insight[] = [];
  const perSystem = new Map<
    string,
    {
      specialists: number;
      total: number;
      success: number;
      docs: number;
      avgAffinity: number;
      _sum: number;
      _samples: number;
    }
  >();

  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const affinity = systemAffinityPercent(entry);
      const acc = perSystem.get(entry.slug) ?? {
        specialists: 0,
        total: 0,
        success: 0,
        docs: 0,
        avgAffinity: 0,
        _sum: 0,
        _samples: 0,
      };
      if (affinity >= SPECIALIST_THRESHOLD) acc.specialists += 1;
      acc.total += entry.total;
      acc.success += entry.success;
      acc.docs += entry.documentation ?? 0;
      acc._sum += affinity;
      acc._samples += 1;
      perSystem.set(entry.slug, acc);
    }
  }

  for (const [slug, v] of perSystem) {
    v.avgAffinity = v._samples > 0 ? Math.round(v._sum / v._samples) : 0;
    const successPct = v.total > 0 ? (v.success / v.total) * 100 : 0;
    if (v.specialists === 1) {
      out.push({
        id: `${slug}:sole`,
        slug,
        tone: "danger",
        text: `O sistema ${slug} depende de apenas um desenvolvedor.`,
      });
    }
    if (v.specialists === 0 && v.total > 0) {
      out.push({
        id: `${slug}:no-specialist`,
        slug,
        tone: "danger",
        text: `${slug} não possui nenhum especialista com afinidade ≥ ${SPECIALIST_THRESHOLD}%.`,
      });
    }
    if (v.docs === 0 && v.total > 0) {
      out.push({
        id: `${slug}:no-docs`,
        slug,
        tone: "warning",
        text: `${slug} não possui documentação escrita.`,
      });
    }
    if (v.total >= 5 && successPct < 60) {
      out.push({
        id: `${slug}:low-success`,
        slug,
        tone: "warning",
        text: `${slug} possui baixa taxa de sucesso (${Math.round(successPct)}%).`,
      });
    }
    if (v.specialists >= 3 && v.avgAffinity >= 60) {
      out.push({
        id: `${slug}:healthy`,
        slug,
        tone: "success",
        text: `${slug} possui boa distribuição de especialistas.`,
      });
    }
    if (v.avgAffinity > 0 && v.avgAffinity < LOW_AFFINITY_THRESHOLD) {
      out.push({
        id: `${slug}:low-affinity`,
        slug,
        tone: "info",
        text: `${slug} apresenta afinidade média baixa (${v.avgAffinity}%) — considere treinar mais devs.`,
      });
    }
  }
  return out;
}

/** Estatísticas comparativas para o card "Minha Especialização". */
export interface DeveloperComparison {
  me: Candidate | null;
  mySystems: Array<{
    slug: string;
    affinity: number;
    entry: SystemHistoryEntry;
    rankPosition: number; // 1-based no ranking do sistema
    rankTotal: number;
    teamAvg: number;
    diff: number;
    breakdown: ReturnType<typeof scoreSystemFitBreakdown>;
  }>;
  teamAvgAffinity: number;
  myAvgAffinity: number;
  totalDocs: number;
  isEmpty: boolean;
}

export function buildDeveloperComparison(
  pool: Candidate[],
  userId: string | null | undefined,
): DeveloperComparison {
  const me = pool.find((c) => c.user_id === userId) ?? null;
  if (!me) {
    return {
      me: null,
      mySystems: [],
      teamAvgAffinity: 0,
      myAvgAffinity: 0,
      totalDocs: 0,
      isEmpty: true,
    };
  }
  const rankings = buildSystemRankings(pool, Number.MAX_SAFE_INTEGER);
  const systemAff = new Map<string, { sum: number; count: number }>();
  for (const dev of pool) {
    for (const entry of dev.system_history) {
      const acc = systemAff.get(entry.slug) ?? { sum: 0, count: 0 };
      acc.sum += systemAffinityPercent(entry);
      acc.count += 1;
      systemAff.set(entry.slug, acc);
    }
  }
  const mySystems = me.system_history
    .map((entry) => {
      const affinity = systemAffinityPercent(entry);
      const ranks = rankings.get(entry.slug) ?? [];
      const idx = ranks.findIndex((r) => r.candidate.user_id === me.user_id);
      const teamStats = systemAff.get(entry.slug) ?? { sum: 0, count: 0 };
      const teamAvg = teamStats.count ? Math.round(teamStats.sum / teamStats.count) : 0;
      return {
        slug: entry.slug,
        affinity,
        entry,
        rankPosition: idx >= 0 ? idx + 1 : 0,
        rankTotal: ranks.length,
        teamAvg,
        diff: affinity - teamAvg,
        breakdown: scoreSystemFitBreakdown(entry),
      };
    })
    .sort((a, b) => b.affinity - a.affinity);

  const myAvg =
    mySystems.length > 0
      ? Math.round(mySystems.reduce((s, x) => s + x.affinity, 0) / mySystems.length)
      : 0;
  const teamAvg = (() => {
    let sum = 0;
    let count = 0;
    for (const [, v] of systemAff) {
      if (v.count === 0) continue;
      sum += v.sum / v.count;
      count += 1;
    }
    return count > 0 ? Math.round(sum / count) : 0;
  })();

  const totalDocs = me.system_history.reduce((n, s) => n + (s.documentation ?? 0), 0);

  return {
    me,
    mySystems,
    teamAvgAffinity: teamAvg,
    myAvgAffinity: myAvg,
    totalDocs,
    isEmpty: mySystems.length === 0,
  };
}

export const SYSTEM_AFFINITY_THRESHOLDS = {
  SPECIALIST: SPECIALIST_THRESHOLD,
  LOW: LOW_AFFINITY_THRESHOLD,
};
