import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { KpiRow, Section, StatCard } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_META } from "@/modules/demands/types";
import type { AnalyticsResult } from "../types";

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}
function hours(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}h`;
}

export function SLASection({ data }: { data: AnalyticsResult }) {
  const s = data.sla;
  return (
    <Section title="SLA" description="Cumprimento por prioridade nas demandas concluídas do período.">
      <KpiRow>
        <StatCard label="SLA cumprido" value={s.cumpridas} tone="success" icon={ShieldCheck} />
        <StatCard label="SLA violado" value={s.violadas} tone={s.violadas > 0 ? "danger" : "success"} icon={AlertTriangle} />
        <StatCard label="% cumprimento" value={pct(s.cumprimentoPct)} tone={
          s.cumprimentoPct === null ? "neutral" : s.cumprimentoPct >= 90 ? "success" : s.cumprimentoPct >= 70 ? "warning" : "danger"
        } />
        <StatCard label="Tempo médio (resolução)" value={hours(s.tempoMedioHoras)} icon={Clock} />
      </KpiRow>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm" aria-label="SLA por prioridade">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Prioridade</th>
                <th className="text-right px-3 py-2">Concluídas</th>
                <th className="text-right px-3 py-2">Cumprimento</th>
              </tr>
            </thead>
            <tbody>
              {s.porPrioridade.map((r) => (
                <tr key={r.priority} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{PRIORITY_META[r.priority].label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{pct(r.cumprimentoPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </Section>
  );
}
