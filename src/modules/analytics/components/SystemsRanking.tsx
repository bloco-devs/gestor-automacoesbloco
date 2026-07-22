import { Section, EmptyPanel } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Server } from "lucide-react";
import type { AnalyticsResult } from "../types";

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(0)}%`;
}

export function SystemsRanking({ data }: { data: AnalyticsResult }) {
  const rows = data.systems.slice(0, 15);
  if (rows.length === 0) {
    return (
      <Section title="Sistemas">
        <EmptyPanel icon={Server} title="Sem dados de sistemas" description="Nenhuma demanda vinculada a um sistema no período." />
      </Section>
    );
  }
  return (
    <Section title="Sistemas" description="Ranking por volume de incidentes, melhorias, automações e backlog.">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Ranking de sistemas">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Sistema</th>
                  <th className="text-right px-3 py-2">Bugs</th>
                  <th className="text-right px-3 py-2">Melhorias</th>
                  <th className="text-right px-3 py-2">Automações</th>
                  <th className="text-right px-3 py-2">Backlog</th>
                  <th className="text-right px-3 py-2">SLA</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id ?? "__none__"} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{r.nome}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.bugs}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.melhorias}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.automacoes}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.backlog}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{pct(r.slaCumprimentoPct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </Section>
  );
}
