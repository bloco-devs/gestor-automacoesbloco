import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDemands } from "@/modules/demands/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { humanizeStatus, humanTime, matchesFilter, type DemandFilter } from "./statusHuman";

const FILTERS: Array<{ id: DemandFilter; label: string }> = [
  { id: "todas", label: "Todas" },
  { id: "abertas", label: "Abertas" },
  { id: "andamento", label: "Em andamento" },
  { id: "concluidas", label: "Concluídas" },
];

export function PortalDemandsList() {
  const { user } = useAuth();
  const { data: demands = [], isLoading } = useDemands();
  const [filter, setFilter] = useState<DemandFilter>("todas");

  const list = useMemo(() => {
    if (!user?.id) return [];
    return demands
      .filter((d) => d.created_by === user.id && matchesFilter(d.status, filter))
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [demands, user?.id, filter]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma demanda encontrada nesta visão.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {list.map((d) => {
            const s = humanizeStatus(d.status);
            return (
              <li key={d.id}>
                <Link
                  to={`/solicitacao/${d.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50"
                >
                  <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.label} · {humanTime(d.updated_at)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
