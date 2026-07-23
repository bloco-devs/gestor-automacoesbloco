/**
 * F018.5 — Heatmap Developer × Sistema.
 * Reutiliza `useTeamPool` (cache do Smart Routing) e `buildAffinityMatrix`.
 */
import { memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTeamPool } from "@/modules/routing";
import { initialsOf } from "@/modules/routing/utils/format";
import { buildAffinityMatrix } from "../utils/systemAffinityAnalytics";

function cellBg(affinity: number): string {
  if (affinity <= 0) return "bg-muted/20";
  // gradient discreto — usamos opacity para não exigir novos tokens
  const level = Math.min(1, affinity / 100);
  const alpha = 0.08 + level * 0.55;
  return `bg-primary/[${alpha.toFixed(2)}]`;
}

export const SystemAffinityHeatmap = memo(function SystemAffinityHeatmap() {
  const { data: pool = [], isLoading } = useTeamPool();
  const matrix = useMemo(() => buildAffinityMatrix(pool), [pool]);

  if (isLoading) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">Carregando heatmap…</Card>
    );
  }
  if (matrix.isEmpty) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Ainda não há histórico suficiente por sistema para gerar o heatmap.
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Afinidade dev × sistema
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>0%</span>
          <span
            className="inline-block h-2 w-24 rounded"
            style={{
              background:
                "linear-gradient(to right, hsl(var(--muted) / 0.2), hsl(var(--primary) / 0.7))",
            }}
            aria-hidden
          />
          <span>100%</span>
        </div>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="overflow-auto">
          <table className="min-w-full border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium text-muted-foreground">
                  Dev / Sistema
                </th>
                {matrix.systems.map((s) => (
                  <th
                    key={s}
                    scope="col"
                    className="px-2 py-1 text-left font-medium text-muted-foreground"
                    title={s}
                  >
                    <span className="inline-block max-w-[100px] truncate align-middle">{s}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.devs.map((dev) => {
                const name = dev.nome || dev.email || dev.user_id;
                return (
                  <tr key={dev.user_id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card px-2 py-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5 shrink-0">
                          {dev.avatar_url && <AvatarImage src={dev.avatar_url} alt={name} />}
                          <AvatarFallback className="text-[9px]">
                            {initialsOf(dev.nome, dev.email ?? dev.user_id)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[140px] truncate text-xs font-medium">{name}</span>
                      </div>
                    </th>
                    {matrix.systems.map((slug) => {
                      const c = matrix.cell(dev.user_id, slug);
                      const affinity = c?.affinity ?? 0;
                      return (
                        <td key={slug} className="p-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                role="img"
                                aria-label={`${name} × ${slug}: ${affinity}%`}
                                className={`flex h-8 w-full min-w-[52px] items-center justify-center rounded text-[10px] font-semibold tabular-nums ${cellBg(
                                  affinity,
                                )}`}
                              >
                                {c ? `${affinity}%` : "—"}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <div className="font-semibold">
                                {name} · {slug}
                              </div>
                              {c ? (
                                <ul className="mt-1 space-y-0.5 text-[11px]">
                                  <li>Afinidade: {c.affinity}%</li>
                                  <li>Demandas: {c.entry.total}</li>
                                  <li>
                                    Sucesso:{" "}
                                    {Math.round(
                                      (c.entry.success / Math.max(1, c.entry.total)) * 100,
                                    )}
                                    %
                                  </li>
                                  <li>
                                    Tempo médio:{" "}
                                    {c.entry.avg_resolution_h > 0
                                      ? c.entry.avg_resolution_h < 1
                                        ? `${Math.round(c.entry.avg_resolution_h * 60)}m`
                                        : `${c.entry.avg_resolution_h.toFixed(1)}h`
                                      : "—"}
                                  </li>
                                  <li>Artigos: {c.entry.documentation ?? 0}</li>
                                </ul>
                              ) : (
                                <p className="mt-1 text-muted-foreground">Sem histórico.</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
    </Card>
  );
});

export default SystemAffinityHeatmap;
