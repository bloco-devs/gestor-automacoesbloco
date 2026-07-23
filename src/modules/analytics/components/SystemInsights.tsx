/**
 * F018.5 — Insights derivados (sem IA, sem edge).
 */
import { memo, useMemo } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeamPool } from "@/modules/routing";
import { buildInsights, type Insight } from "../utils/systemAffinityAnalytics";

const TONE: Record<Insight["tone"], string> = {
  danger: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-warning/40 bg-warning/5 text-warning",
  info: "border-info/40 bg-info/5 text-info",
  success: "border-success/40 bg-success/5 text-success",
};

export const SystemInsights = memo(function SystemInsights({ limit = 12 }: { limit?: number }) {
  const { data: pool = [], isLoading } = useTeamPool();
  const insights = useMemo(() => buildInsights(pool).slice(0, limit), [pool, limit]);

  if (isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">Calculando insights…</Card>;
  }
  if (insights.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Sem insights derivados no momento — o ecossistema está estável.
      </Card>
    );
  }

  return (
    <Card className="space-y-2 p-4">
      <header className="flex items-center gap-2">
        <Lightbulb className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Insights derivados</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
          {insights.length}
        </span>
      </header>
      <ul className="space-y-1.5">
        {insights.map((i) => (
          <li
            key={i.id}
            className={"flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs " + TONE[i.tone]}
          >
            <Badge variant="outline" className="h-4 shrink-0 border-current/40 text-[10px]">
              {i.slug}
            </Badge>
            <span className="flex-1 text-foreground/90">{i.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
});

export default SystemInsights;
