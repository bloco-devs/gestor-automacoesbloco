/**
 * F018.5 — Cobertura do Ecossistema.
 * Mostra quantos sistemas têm 0 / 1 / 2+ especialistas.
 */
import { memo, useMemo } from "react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { KpiRow, StatCard } from "@/design-system";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTeamPool } from "@/modules/routing";
import { buildCoverage } from "../utils/systemAffinityAnalytics";

export const SystemCoverageCard = memo(function SystemCoverageCard() {
  const { data: pool = [], isLoading } = useTeamPool();
  const cov = useMemo(() => buildCoverage(pool), [pool]);

  const total = cov.totalSystems;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-3">
      <KpiRow>
        <StatCard
          label="Sem especialista"
          value={cov.zero.length}
          icon={ShieldAlert}
          tone="danger"
          hint={`${pct(cov.zero.length)}%`}
        />
        <StatCard
          label="Um especialista"
          value={cov.one.length}
          icon={ShieldQuestion}
          tone="warning"
          hint={`${pct(cov.one.length)}%`}
        />
        <StatCard
          label="Dois ou mais"
          value={cov.twoPlus.length}
          icon={ShieldCheck}
          tone="success"
          hint={`${pct(cov.twoPlus.length)}%`}
        />
        <StatCard
          label="Cobertura geral"
          value={`${cov.pctCovered}%`}
          tone={cov.pctCovered >= 70 ? "success" : cov.pctCovered >= 40 ? "warning" : "danger"}
          hint={`${total} sistemas`}
        />
      </KpiRow>

      <Card className="space-y-3 p-4">
        {isLoading && <p className="text-sm text-muted-foreground">Carregando cobertura…</p>}
        {!isLoading && total === 0 && (
          <p className="text-sm text-muted-foreground">
            Ainda não há sistemas com histórico suficiente.
          </p>
        )}
        {total > 0 && (
          <>
            <Bar label="Sem especialista" value={cov.zero.length} total={total} tone="danger" />
            <Bar label="Um especialista" value={cov.one.length} total={total} tone="warning" />
            <Bar label="Dois ou mais" value={cov.twoPlus.length} total={total} tone="success" />
            {cov.zero.length > 0 && (
              <div className="space-y-1 pt-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Sistemas sem especialista
                </p>
                <div className="flex flex-wrap gap-1">
                  {cov.zero.map((s) => (
                    <Badge key={s} variant="outline" className="h-5 text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
});

function Bar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "danger" | "warning" | "success";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const toneClass = {
    danger: "bg-destructive/70",
    warning: "bg-warning/70",
    success: "bg-success/70",
  }[tone];
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-muted/40">
        <div
          className={"h-full transition-all " + toneClass}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}

export default SystemCoverageCard;
