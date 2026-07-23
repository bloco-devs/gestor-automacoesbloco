/**
 * F018.5 — Painel de Risco Operacional.
 * Detecta sistemas frágeis usando apenas dados existentes.
 */
import { memo, useMemo } from "react";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamPool } from "@/modules/routing";
import { detectRisks, type Risk, type RiskSeverity } from "../utils/systemAffinityAnalytics";

const TONE: Record<
  RiskSeverity,
  { icon: typeof AlertTriangle; className: string; label: string }
> = {
  alta: {
    icon: AlertOctagon,
    className: "border-destructive/40 bg-destructive/5 text-destructive",
    label: "Alta",
  },
  media: {
    icon: AlertTriangle,
    className: "border-warning/40 bg-warning/5 text-warning",
    label: "Média",
  },
  baixa: {
    icon: Info,
    className: "border-info/40 bg-info/5 text-info",
    label: "Baixa",
  },
};

export const SystemRiskCard = memo(function SystemRiskCard({
  limit = 12,
}: {
  limit?: number;
}) {
  const { data: pool = [], isLoading } = useTeamPool();
  const risks = useMemo(() => detectRisks(pool).slice(0, limit), [pool, limit]);

  if (isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">Analisando riscos…</Card>;
  }
  if (risks.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Nenhum risco detectado. Todos os sistemas com histórico têm cobertura saudável.
      </Card>
    );
  }

  return (
    <Card className="space-y-2 p-4">
      <header className="flex items-center gap-2">
        <AlertOctagon className="size-4 text-destructive" aria-hidden />
        <h3 className="text-sm font-semibold">Risco Operacional</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {risks.length} sistema{risks.length > 1 ? "s" : ""}
        </span>
      </header>
      <ul className="space-y-2">
        {risks.map((r: Risk) => {
          const tone = TONE[r.severity];
          const Icon = tone.icon;
          return (
            <li
              key={r.slug}
              className={"rounded-md border p-3 " + tone.className}
              aria-label={`Risco ${tone.label}: ${r.slug}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="size-4 shrink-0" aria-hidden />
                <Badge variant="outline" className="h-5 border-current/40 text-[10px]">
                  {r.slug}
                </Badge>
                <span className="ml-auto text-[10px] uppercase tracking-wide">
                  {tone.label}
                </span>
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {r.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {r.soleSpecialist && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Único especialista:{" "}
                  <strong className="text-foreground">
                    {r.soleSpecialist.nome ||
                      r.soleSpecialist.email ||
                      r.soleSpecialist.user_id}
                  </strong>
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
});

export default SystemRiskCard;
