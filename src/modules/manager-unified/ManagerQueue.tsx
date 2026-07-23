import { Link } from "react-router-dom";
import { Clock, AlertOctagon, UserX } from "lucide-react";
import { useOperationsData } from "@/modules/operations";

/**
 * Fila em risco — poucos indicadores essenciais.
 * SLA estourado, em atenção e sem responsável.
 */
export function ManagerQueue() {
  const { data } = useOperationsData();
  const b = data?.buckets;
  const rows = [
    { icon: AlertOctagon, label: "SLA estourado", value: b?.slaEstourado ?? 0, tone: "text-red-500" },
    { icon: Clock, label: "SLA em atenção", value: b?.slaEmAtencao ?? 0, tone: "text-amber-500" },
    { icon: UserX, label: "Sem responsável", value: b?.semResponsavel ?? 0, tone: "text-muted-foreground" },
  ];

  return (
    <section aria-labelledby="mgr-queue" className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between">
        <h2 id="mgr-queue" className="text-lg font-semibold tracking-tight">
          Fila em risco
        </h2>
        <Link to="/gestao/demandas" className="text-xs text-muted-foreground hover:text-foreground">
          Abrir fila
        </Link>
      </header>
      <ul className="grid grid-cols-1 divide-y divide-border rounded-lg border border-border bg-card/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <li key={r.label} className="flex items-center gap-3 px-4 py-3">
              <Icon className={`size-4 ${r.tone}`} aria-hidden />
              <div className="min-w-0">
                <div className="text-2xl font-semibold tabular-nums leading-none">{r.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.label}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
