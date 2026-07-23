/**
 * F018.5 — Top especialistas por sistema.
 * Reutiliza `useTeamPool` + `buildSystemRankings`.
 */
import { memo, useMemo } from "react";
import { Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useTeamPool } from "@/modules/routing";
import { initialsOf } from "@/modules/routing/utils/format";
import { buildSystemRankings } from "../utils/systemAffinityAnalytics";

export const SystemAffinityRanking = memo(function SystemAffinityRanking({
  topN = 5,
  systemsLimit = 8,
}: {
  topN?: number;
  systemsLimit?: number;
}) {
  const { data: pool = [], isLoading } = useTeamPool();
  const rankings = useMemo(() => buildSystemRankings(pool, topN), [pool, topN]);

  const systems = useMemo(() => {
    const rows = Array.from(rankings.entries()).map(([slug, list]) => ({
      slug,
      list,
      totalDemands: list.reduce((n, x) => n + x.entry.total, 0),
    }));
    rows.sort((a, b) => b.totalDemands - a.totalDemands);
    return rows.slice(0, systemsLimit);
  }, [rankings, systemsLimit]);

  if (isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">Carregando ranking…</Card>;
  }
  if (systems.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Ainda não há histórico por sistema para gerar o ranking.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {systems.map(({ slug, list }) => (
        <Card key={slug} className="space-y-2 p-4">
          <header className="flex items-center gap-2">
            <Badge variant="outline" className="h-5 text-[10px]">
              {slug}
            </Badge>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
              Top {list.length}
            </span>
          </header>
          <ul className="divide-y divide-border/60">
            {list.map((r, idx) => {
              const c = r.candidate;
              const name = c.nome || c.email || c.user_id;
              const successPct = Math.round(
                (r.entry.success / Math.max(1, r.entry.total)) * 100,
              );
              const avg = r.entry.avg_resolution_h;
              return (
                <li key={c.user_id} className="flex items-center gap-3 py-1.5 first:pt-0">
                  <span className="w-4 shrink-0 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <Avatar className="size-7 shrink-0">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} alt={name} />}
                    <AvatarFallback className="text-[10px]">
                      {initialsOf(c.nome, c.email ?? c.user_id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium">{name}</span>
                      {r.isSpecialist && (
                        <Badge
                          variant="outline"
                          className="h-4 gap-0.5 border-primary/40 bg-primary/10 px-1 text-[9px] text-primary"
                        >
                          <Award className="size-2.5" />
                          Especialista
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0 text-[10px] tabular-nums text-muted-foreground">
                      <span>{r.entry.total} demandas</span>
                      <span>{successPct}% sucesso</span>
                      <span>
                        {avg > 0 ? (avg < 1 ? `${Math.round(avg * 60)}m` : `${avg.toFixed(1)}h`) : "—"}
                      </span>
                      <span>{r.entry.documentation ?? 0} artigos</span>
                    </div>
                  </div>
                  <div className="w-16 shrink-0 text-right">
                    <div className="text-[10px] tabular-nums text-muted-foreground">
                      {r.affinity}%
                    </div>
                    <Progress value={r.affinity} className="h-1.5" />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
});

export default SystemAffinityRanking;
