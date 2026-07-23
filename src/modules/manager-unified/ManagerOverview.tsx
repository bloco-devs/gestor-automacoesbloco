import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useOperationsData } from "@/modules/operations";

/**
 * Demandas críticas — lista mínima ordenada por score.
 * Reutiliza `useOperationsData` (rankCritical). Sem KPI grid.
 */
export function ManagerOverview() {
  const { data, loading } = useOperationsData();
  const items = data?.critical.slice(0, 6) ?? [];

  return (
    <section aria-labelledby="mgr-critical" className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 id="mgr-critical" className="text-lg font-semibold tracking-tight">
          O que precisa da sua atenção agora
        </h2>
        {items.length > 0 && (
          <Link to="/gestao/demandas" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todas <ArrowRight className="ml-1 inline size-3" aria-hidden />
          </Link>
        )}
      </header>

      {loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada urgente no momento.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card/40">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden />
              <div className="min-w-0 flex-1">
                <Link to={c.href} className="line-clamp-1 text-sm font-medium hover:underline">
                  {c.title}
                </Link>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {c.reasons.join(" · ") || "Prioridade alta"}
                </p>
              </div>
              <span className="hidden text-[11px] uppercase tracking-wide text-muted-foreground md:inline">
                {c.priority}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
