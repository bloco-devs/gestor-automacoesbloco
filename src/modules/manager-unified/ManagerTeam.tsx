import { Link } from "react-router-dom";
import { useOperationsData } from "@/modules/operations";

interface Props {
  limit?: number;
  showLink?: boolean;
}

/**
 * Equipe — lista simples. Carga e demandas por pessoa.
 * Reutiliza workloads já carregados pelo `useOperationsData`.
 */
export function ManagerTeam({ limit = 6, showLink = true }: Props) {
  const { data, profiles } = useOperationsData();
  const workloads = (data?.workloads ?? []).slice(0, limit);

  return (
    <section aria-labelledby="mgr-team" className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 id="mgr-team" className="text-lg font-semibold tracking-tight">
          Equipe
        </h2>
        {showLink && (
          <Link to="/gestao/equipe" className="text-xs text-muted-foreground hover:text-foreground">
            Ver todos
          </Link>
        )}
      </header>

      {workloads.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados de carga no momento.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card/40">
          {workloads.map((w) => {
            const p = profiles.get(w.user_id);
            const nome = p?.full_name || p?.email || "Sem nome";
            return (
              <li key={w.user_id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium">{nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.total ?? 0} demandas · {w.em_andamento ?? 0} em andamento
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
