/**
 * F018.4 — AfinidadeSistemaSection para /admin/analytics.
 * Reutiliza o CandidatePool. Tudo agregado em memória, sem novas queries.
 */
import { memo, useMemo } from "react";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { KpiRow, Section, StatCard } from "@/design-system";
import { useTeamPool } from "@/modules/routing";
import { systemAffinityPercent } from "@/modules/routing/engine/system-fit";
import type { Candidate } from "@/modules/routing/types";

interface SystemAggregate {
  slug: string;
  total: number;
  success: number;
  experts: number;
  avgAffinity: number;
  best: { user: Candidate; pct: number } | null;
}

export const AfinidadeSistemaSection = memo(function AfinidadeSistemaSection() {
  const { data: pool = [], isLoading } = useTeamPool();

  const agg = useMemo(() => {
    const bySlug = new Map<
      string,
      { total: number; success: number; sumAff: number; experts: number; best: SystemAggregate["best"] }
    >();
    let matched = 0;
    let totalCandidates = pool.length;
    let orphanSystems = 0;
    let sumAffinity = 0;
    let sumSamples = 0;

    for (const c of pool) {
      for (const e of c.system_history) {
        const pct = systemAffinityPercent(e);
        const cur = bySlug.get(e.slug) ?? {
          total: 0,
          success: 0,
          sumAff: 0,
          experts: 0,
          best: null as SystemAggregate["best"],
        };
        cur.total += e.total;
        cur.success += e.success;
        cur.sumAff += pct;
        cur.experts += 1;
        if (!cur.best || pct > cur.best.pct) cur.best = { user: c, pct };
        bySlug.set(e.slug, cur);
        sumAffinity += pct;
        sumSamples += 1;
        matched += 1;
      }
    }

    const systems: SystemAggregate[] = Array.from(bySlug.entries())
      .map(([slug, v]) => ({
        slug,
        total: v.total,
        success: v.success,
        experts: v.experts,
        avgAffinity: v.experts > 0 ? Math.round(v.sumAff / v.experts) : 0,
        best: v.best,
      }))
      .sort((a, b) => b.total - a.total);

    orphanSystems = systems.filter((s) => s.experts === 0).length;

    return {
      systems,
      avgAffinity: sumSamples > 0 ? Math.round(sumAffinity / sumSamples) : 0,
      matched,
      totalCandidates,
      orphanSystems,
    };
  }, [pool]);

  return (
    <Section
      id="analytics-afinidade-sistema"
      title="Afinidade por Sistema"
      description="Especialistas por sistema do Ecossistema. Base: CandidatePool (últimos 90 dias)."
    >
      <KpiRow>
        <StatCard
          label="Sistemas ativos"
          value={agg.systems.length}
          icon={Layers}
          tone="info"
        />
        <StatCard
          label="Especialistas"
          value={agg.matched}
          hint={`${agg.totalCandidates} candidatos ao pool`}
        />
        <StatCard
          label="Afinidade média"
          value={`${agg.avgAffinity}%`}
          tone={agg.avgAffinity >= 60 ? "success" : agg.avgAffinity >= 30 ? "warning" : "neutral"}
        />
        <StatCard
          label="Sistemas órfãos"
          value={agg.orphanSystems}
          tone={agg.orphanSystems > 0 ? "warning" : "success"}
          hint="sem responsável recente"
        />
      </KpiRow>

      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando afinidade…</p>
        ) : agg.systems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados suficientes. Assim que houver demandas concluídas com sistema relacionado,
            a afinidade aparecerá aqui.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {agg.systems.slice(0, 20).map((s) => (
              <li
                key={s.slug}
                className="grid grid-cols-[minmax(0,1fr)_120px_120px_100px] items-center gap-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {s.slug}
                    </Badge>
                    {s.best && (
                      <span className="truncate text-xs text-muted-foreground">
                        Top: {s.best.user.nome || s.best.user.email || s.best.user.user_id}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {s.total} demandas
                </div>
                <div className="text-right text-xs tabular-nums text-muted-foreground">
                  {Math.round((s.success / Math.max(1, s.total)) * 100)}% sucesso
                </div>
                <div>
                  <div className="mb-0.5 text-right text-[10px] tabular-nums text-muted-foreground">
                    {s.avgAffinity}%
                  </div>
                  <Progress value={s.avgAffinity} className="h-1.5" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
});

export default AfinidadeSistemaSection;
