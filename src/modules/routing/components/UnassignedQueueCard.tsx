import { useMemo } from "react";
import { Link } from "react-router-dom";
import { UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDemands } from "@/modules/demands/hooks";
import type { Demand } from "@/modules/demands/types";
import { rankCandidates } from "../engine/ranker";
import { useTeamPool } from "../hooks/useTeamPool";
import { cn } from "@/lib/utils";

interface Props {
  limit?: number;
}

/**
 * Card do Centro de Operações — fila sem responsável ranqueada pelo score
 * do top candidato sugerido pela IA.
 */
export function UnassignedQueueCard({ limit = 6 }: Props) {
  const { data: demands = [] } = useDemands();
  const { data: pool = [] } = useTeamPool();

  const unassigned = useMemo(
    () =>
      (demands as Demand[]).filter(
        (d) => !d.assigned_to && d.status !== "concluido",
      ),
    [demands],
  );

  const withSuggestion = useMemo(() => {
    return unassigned
      .map((d) => {
        const ranking = rankCandidates(
          { type: d.type, priority: d.priority, complexity: d.complexity, sla_status: d.sla_status },
          pool,
        );
        return { demand: d, top: ranking.top };
      })
      .sort((a, b) => (b.top?.score ?? 0) - (a.top?.score ?? 0))
      .slice(0, limit);
  }, [unassigned, pool, limit]);

  return (
    <section className="rounded-lg border border-border/60 bg-card p-4">
      <header className="flex items-center gap-2 mb-3">
        <UserX className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Fila sem responsável</h3>
        <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
          {unassigned.length}
        </Badge>
      </header>
      {withSuggestion.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nada pendente — a fila está balanceada.</p>
      ) : (
        <ul className="space-y-2">
          {withSuggestion.map(({ demand, top }) => (
            <li key={demand.id} className="flex items-center gap-3 rounded-md border border-border/40 p-2">
              <Link
                to={`/admin/demandas?demand=${demand.id}`}
                className="text-xs font-medium truncate flex-1 hover:underline"
              >
                {demand.title}
              </Link>
              {top ? (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border",
                    top.confidence === "high"
                      ? "border-success/40 text-success bg-success/10"
                      : top.confidence === "medium"
                      ? "border-info/40 text-info bg-info/10"
                      : "border-border text-muted-foreground bg-muted",
                  )}
                >
                  {top.candidate.nome || top.candidate.email || "?"} · {top.score}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">sem sugestão</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default UnassignedQueueCard;
