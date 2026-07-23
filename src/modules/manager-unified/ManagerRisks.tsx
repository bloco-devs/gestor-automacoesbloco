import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { useOperationsData } from "@/modules/operations";

const ICONS = {
  info: Info,
  attention: AlertTriangle,
  risk: ShieldAlert,
} as const;

const TONES = {
  info: "text-muted-foreground",
  attention: "text-amber-500",
  risk: "text-red-500",
} as const;

/** Riscos — insights heurísticos locais (sem IA remota). */
export function ManagerRisks() {
  const { data } = useOperationsData();
  const insights = (data?.insights ?? []).slice(0, 5);

  return (
    <section aria-labelledby="mgr-risks" className="flex flex-col gap-3">
      <h2 id="mgr-risks" className="text-lg font-semibold tracking-tight">
        Riscos
      </h2>
      {insights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum risco detectado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {insights.map((i) => {
            const Icon = ICONS[i.severity];
            return (
              <li
                key={i.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card/40 px-3 py-2.5"
              >
                <Icon className={`mt-0.5 size-4 shrink-0 ${TONES[i.severity]}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{i.detail}</div>
                </div>
                {i.action && (
                  <Link to={i.action.href} className="text-xs text-primary hover:underline">
                    {i.action.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
