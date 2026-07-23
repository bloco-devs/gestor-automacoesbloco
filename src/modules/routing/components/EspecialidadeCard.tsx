/**
 * F018.4 — EspecialidadeCard
 * Card somente-leitura para o Developer Workspace / Analytics.
 * Reutiliza o CandidatePool (useTeamPool) e o breakdown por sistema.
 */
import { memo, useMemo } from "react";
import { Award, Book, Clock, Layers, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTeamPool } from "../hooks/useTeamPool";
import { systemAffinityPercent } from "../engine/system-fit";

interface Props {
  userId: string | null | undefined;
  /** Máx. de sistemas exibidos. */
  limit?: number;
  className?: string;
}

export const EspecialidadeCard = memo(function EspecialidadeCard({
  userId,
  limit = 5,
  className,
}: Props) {
  const { data: pool, isLoading } = useTeamPool();

  const view = useMemo(() => {
    if (!userId || !pool) return null;
    const me = pool.find((c) => c.user_id === userId);
    if (!me) return null;
    const systems = [...me.system_history]
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map((s) => ({
        ...s,
        pct: systemAffinityPercent(s),
      }));
    const topTypes = Object.entries(me.type_history)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const docsTotal = me.system_history.reduce((n, s) => n + (s.documentation ?? 0), 0);
    return {
      me,
      systems,
      topTypes,
      docsTotal,
    };
  }, [pool, userId, limit]);

  return (
    <Card className={"p-4 space-y-3 " + (className ?? "")}>
      <header className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Especialidade</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          Somente leitura
        </span>
      </header>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Carregando histórico…</p>
      )}
      {!isLoading && !view && (
        <p className="text-xs text-muted-foreground">
          Sem histórico suficiente para calcular especialidade.
        </p>
      )}

      {view && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat
              icon={<Layers className="size-3.5" />}
              label="Resolvidas"
              value={view.me.resolved_count}
            />
            <MiniStat
              icon={<Clock className="size-3.5" />}
              label="Tempo médio"
              value={
                view.me.avg_resolution_h != null
                  ? view.me.avg_resolution_h < 1
                    ? `${Math.round(view.me.avg_resolution_h * 60)}m`
                    : `${view.me.avg_resolution_h.toFixed(1)}h`
                  : "—"
              }
            />
            <MiniStat
              icon={<Book className="size-3.5" />}
              label="Artigos"
              value={view.docsTotal}
            />
          </div>

          {view.systems.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Top sistemas
              </p>
              {view.systems.map((s) => (
                <div key={s.slug} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium">{s.slug}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.total} · {Math.round((s.success / Math.max(1, s.total)) * 100)}% · {s.pct}
                      %
                    </span>
                  </div>
                  <Progress value={s.pct} className="h-1.5" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ainda sem sistemas atrelados às demandas resolvidas.
            </p>
          )}

          {view.topTypes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Top categorias
              </p>
              <div className="flex flex-wrap gap-1">
                {view.topTypes.map(([type, count]) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className="h-5 gap-1 text-[10px]"
                  >
                    <Award className="size-3" />
                    {type} · {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
});

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default EspecialidadeCard;
