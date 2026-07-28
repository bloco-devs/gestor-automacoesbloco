import { useMemo } from "react";
import { AlertTriangle, Info, Lightbulb, TriangleAlert } from "lucide-react";
import { buildInsights } from "@/modules/operations";
import { EmptyPanel, Section } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsResult } from "../types";
import type { OperationsInsight } from "@/modules/operations";
import type { UserWorkload } from "@/modules/demands/service";

const ICONS = {
  info: Info,
  attention: TriangleAlert,
  risk: AlertTriangle,
} as const;

function toneClass(sev: OperationsInsight["severity"]): string {
  if (sev === "risk") return "text-destructive";
  if (sev === "attention") return "text-warning";
  return "text-info";
}

export function InsightsSection({
  data,
  workloads,
}: {
  data: AnalyticsResult;
  workloads: UserWorkload[];
}) {
  const insights = useMemo(
    () => buildInsights(data.demandsFiltered, workloads),
    [data.demandsFiltered, workloads],
  );

  return (
    <Section
      title="Insights inteligentes"
      description="Gerados pelo Insights Engine do Centro de Operações — somente leitura."
    >
      {insights.length === 0 ? (
        <EmptyPanel
          icon={Lightbulb}
          title="Sem alertas no momento"
          description="Nenhum gargalo, sobrecarga ou risco de SLA identificado no período filtrado."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((i) => {
            const Icon = ICONS[i.severity];
            return (
              <Card key={i.id}>
                <CardContent className="p-4 flex gap-3">
                  <Icon className={`size-5 mt-0.5 shrink-0 ${toneClass(i.severity)}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="ds-card-title">{i.title}</div>
                    <p className="ds-caption text-muted-foreground mt-1">{i.detail}</p>
                    {i.action ? (
                      <a
                        className="ds-caption text-primary underline underline-offset-2 mt-1 inline-block"
                        href={i.action.href}
                      >
                        {i.action.label}
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}
