/**
 * F018.4 — EspecialistasEcossistemaCard
 * Painel para /operacoes. Para cada sistema, elege o candidato de maior
 * afinidade e lista carga/sucesso/tempo médio. Reutiliza o CandidatePool.
 */
import { memo, useMemo } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTeamPool } from "../hooks/useTeamPool";
import { systemAffinityPercent } from "../engine/system-fit";
import { initialsOf } from "../utils/format";
import type { Candidate, SystemHistoryEntry } from "../types";

interface Row {
  slug: string;
  candidate: Candidate;
  entry: SystemHistoryEntry;
  affinity: number;
}

export const EspecialistasEcossistemaCard = memo(function EspecialistasEcossistemaCard({
  limit = 8,
  className,
}: {
  limit?: number;
  className?: string;
}) {
  const { data: pool, isLoading } = useTeamPool();

  const rows = useMemo<Row[]>(() => {
    if (!pool) return [];
    const bySlug = new Map<string, Row>();
    for (const c of pool) {
      for (const e of c.system_history) {
        const affinity = systemAffinityPercent(e);
        const cur = bySlug.get(e.slug);
        if (!cur || affinity > cur.affinity) {
          bySlug.set(e.slug, { slug: e.slug, candidate: c, entry: e, affinity });
        }
      }
    }
    return Array.from(bySlug.values())
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, limit);
  }, [pool, limit]);

  return (
    <Card className={"p-4 space-y-3 " + (className ?? "")}>
      <header className="flex items-center gap-2">
        <Users className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Especialistas do Ecossistema</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {rows.length} sistemas
        </span>
      </header>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando pool…</p>}
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Ainda não há histórico suficiente para identificar especialistas por sistema.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => {
            const name = r.candidate.nome || r.candidate.email || "Sem nome";
            const successPct = Math.round((r.entry.success / Math.max(1, r.entry.total)) * 100);
            const avg = r.entry.avg_resolution_h;
            const avgLabel =
              avg > 0 ? (avg < 1 ? `${Math.round(avg * 60)}m` : `${avg.toFixed(1)}h`) : "—";
            return (
              <li key={r.slug} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Avatar className="size-8 shrink-0">
                  {r.candidate.avatar_url && (
                    <AvatarImage src={r.candidate.avatar_url} alt={name} />
                  )}
                  <AvatarFallback className="text-[11px]">
                    {initialsOf(r.candidate.nome, r.candidate.email ?? r.candidate.user_id)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <Badge variant="outline" className="h-5 text-[10px]">
                      {r.slug}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">{r.entry.total} demandas</span>
                    <span>·</span>
                    <span className="tabular-nums">{successPct}% sucesso</span>
                    <span>·</span>
                    <span className="tabular-nums">{avgLabel}</span>
                    <span>·</span>
                    <span className="tabular-nums">Carga {r.candidate.active_count}</span>
                  </div>
                </div>
                <div className="w-24 shrink-0">
                  <div className="mb-0.5 text-right text-[10px] tabular-nums text-muted-foreground">
                    {r.affinity}%
                  </div>
                  <Progress value={r.affinity} className="h-1.5" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
});

export default EspecialistasEcossistemaCard;
