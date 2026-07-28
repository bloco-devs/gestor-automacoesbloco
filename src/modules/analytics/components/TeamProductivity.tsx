import { Section, EmptyPanel } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { AnalyticsResult } from "../types";

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(0)}%`;
}
function hours(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}h`;
}

export function TeamProductivity({ data }: { data: AnalyticsResult }) {
  const rows = data.devs;
  return (
    <Section
      title="Produtividade da equipe"
      description="Ordenado por número de demandas concluídas no período."
    >
      {rows.length === 0 ? (
        <EmptyPanel
          icon={Users}
          title="Sem dados de equipe"
          description="Nenhum atendente encontrado no período. Ajuste os filtros ou aguarde novas atribuições."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Produtividade da equipe">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Desenvolvedor</th>
                    <th className="text-right px-3 py-2">Concluídas</th>
                    <th className="text-right px-3 py-2">Backlog</th>
                    <th className="text-right px-3 py-2">Tempo médio</th>
                    <th className="text-right px-3 py-2">SLA</th>
                    <th className="text-right px-3 py-2">Workload</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user_id} className="border-t border-border/60">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-7">
                            {r.avatar_url ? <AvatarImage src={r.avatar_url} alt="" /> : null}
                            <AvatarFallback>
                              {(r.nome ?? r.email ?? "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {r.nome ?? r.email ?? r.user_id.slice(0, 6)}
                            </div>
                            {r.email ? (
                              <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.concluidas}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.backlogAtual}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{hours(r.tempoMedioHoras)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pct(r.slaCumprimentoPct)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.workload}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </Section>
  );
}
