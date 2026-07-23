/**
 * F018.5 — "Minha Especialização" para o Developer Workspace.
 * Reutiliza `useTeamPool` + `buildDeveloperComparison`.
 * Comparação afinidade × média do time; posição de ranking por sistema.
 */
import { memo, useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Award, Minus, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTeamPool } from "@/modules/routing";
import { buildDeveloperComparison } from "../utils/systemAffinityAnalytics";

interface Props {
  userId: string | null | undefined;
  limit?: number;
  className?: string;
}

export const MinhaEspecializacaoCard = memo(function MinhaEspecializacaoCard({
  userId,
  limit = 5,
  className,
}: Props) {
  const { data: pool = [], isLoading } = useTeamPool();
  const view = useMemo(() => buildDeveloperComparison(pool, userId), [pool, userId]);
  const rows = view.mySystems.slice(0, limit);
  const diffTotal = view.myAvgAffinity - view.teamAvgAffinity;

  return (
    <Card className={"p-4 space-y-3 " + (className ?? "")}>
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Minha Especialização</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          vs. média do time
        </span>
      </header>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!isLoading && view.isEmpty && (
        <p className="text-xs text-muted-foreground">
          Você ainda não tem histórico suficiente por sistema.
        </p>
      )}

      {!view.isEmpty && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Minha média" value={`${view.myAvgAffinity}%`} />
            <MiniStat label="Média do time" value={`${view.teamAvgAffinity}%`} />
            <MiniStat
              label="Delta"
              value={
                <span className="inline-flex items-center gap-0.5 tabular-nums">
                  {diffTotal > 0 ? (
                    <ArrowUpRight className="size-3 text-success" />
                  ) : diffTotal < 0 ? (
                    <ArrowDownRight className="size-3 text-destructive" />
                  ) : (
                    <Minus className="size-3 text-muted-foreground" />
                  )}
                  {diffTotal > 0 ? "+" : ""}
                  {diffTotal}
                </span>
              }
            />
          </div>

          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.slug} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {r.slug}
                  </Badge>
                  {r.rankPosition === 1 && r.rankTotal > 1 && (
                    <Badge
                      variant="outline"
                      className="h-4 gap-0.5 border-primary/40 bg-primary/10 px-1 text-[9px] text-primary"
                    >
                      <Award className="size-2.5" />
                      Top 1 de {r.rankTotal}
                    </Badge>
                  )}
                  <span className="ml-auto tabular-nums text-muted-foreground">
                    {r.affinity}% · média {r.teamAvg}%
                  </span>
                </div>
                <Progress value={r.affinity} className="h-1.5" />
                <div className="flex flex-wrap gap-x-2 gap-y-0 text-[10px] text-muted-foreground tabular-nums">
                  <span>{r.entry.total} demandas</span>
                  <span>
                    {Math.round((r.entry.success / Math.max(1, r.entry.total)) * 100)}% sucesso
                  </span>
                  {r.entry.avg_resolution_h > 0 && (
                    <span>
                      {r.entry.avg_resolution_h < 1
                        ? `${Math.round(r.entry.avg_resolution_h * 60)}m`
                        : `${r.entry.avg_resolution_h.toFixed(1)}h`}
                    </span>
                  )}
                  <span>{r.entry.documentation ?? 0} artigos</span>
                  <span
                    className={
                      r.diff > 0
                        ? "text-success"
                        : r.diff < 0
                          ? "text-destructive"
                          : "text-muted-foreground"
                    }
                  >
                    {r.diff > 0 ? "+" : ""}
                    {r.diff} vs média
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
});

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default MinhaEspecializacaoCard;
