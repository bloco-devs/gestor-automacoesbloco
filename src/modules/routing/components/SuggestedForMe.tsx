import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useDemands } from "@/modules/demands/hooks";
import type { Demand } from "@/modules/demands/types";
import { rankCandidates } from "../engine/ranker";
import { useTeamPool } from "../hooks/useTeamPool";

interface Props {
  minScore?: number;
  limit?: number;
}

/**
 * Bloco para o Inbox: solicitações sem responsável cujo top pick é o usuário atual.
 * Puramente sugestão — a atribuição continua manual.
 */
export function SuggestedForMe({ minScore = 70, limit = 5 }: Props) {
  const { user } = useAuth();
  const { data: demands = [] } = useDemands();
  const { data: pool = [] } = useTeamPool();

  const suggestions = useMemo(() => {
    if (!user?.id) return [] as Array<{ demand: Demand; score: number }>;
    const unassigned = (demands as Demand[]).filter(
      (d) => !d.assigned_to && d.status !== "concluido",
    );
    const out: Array<{ demand: Demand; score: number }> = [];
    for (const d of unassigned) {
      const r = rankCandidates(
        { type: d.type, priority: d.priority, complexity: d.complexity, sla_status: d.sla_status },
        pool,
      );
      if (r.top && r.top.candidate.user_id === user.id && r.top.score >= minScore) {
        out.push({ demand: d, score: r.top.score });
      }
    }
    return out.sort((a, b) => b.score - a.score).slice(0, limit);
  }, [demands, pool, user?.id, minScore, limit]);

  if (suggestions.length === 0) return null;

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <header className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Sugestões para você</h3>
        <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
          {suggestions.length}
        </Badge>
      </header>
      <ul className="space-y-2">
        {suggestions.map(({ demand, score }) => (
          <li key={demand.id} className="flex items-center gap-3">
            <Link
              to={`/admin/demandas?demand=${demand.id}`}
              className="text-xs font-medium flex-1 truncate hover:underline"
            >
              {demand.title}
            </Link>
            <Badge variant="outline" className="h-5 text-[10px] border-primary/40 text-primary bg-primary/10">
              combina · {score}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A IA identificou que estas solicitações combinam com seu histórico e carga atual.
      </p>
    </section>
  );
}

export default SuggestedForMe;
