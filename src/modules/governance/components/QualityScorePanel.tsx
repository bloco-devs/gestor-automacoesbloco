import { memo, useMemo } from "react";
import { Section, StatCard, KpiRow } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeQualityScore } from "../quality/score";

export const QualityScorePanel = memo(function QualityScorePanel() {
  const score = useMemo(() => computeQualityScore(), []);
  return (
    <Section title="Quality Score" description="Somente leitura — derivado dos indicadores do inventário.">
      <KpiRow>
        <StatCard label="Nota geral" value={score.grade} tone={score.grade === "C" ? "warning" : "success"} hint={`Score ${score.total}/100`} />
        {score.axes.slice(0, 5).map((a) => (
          <StatCard key={a.key} label={a.label} value={`${a.score}`} hint={a.detail} />
        ))}
      </KpiRow>
      <Card className="surface-1 mt-3">
        <CardContent className="space-y-2 pt-4 text-xs">
          {score.axes.map((a) => (
            <div key={a.key}>
              <div className="flex items-center justify-between text-foreground">
                <span>{a.label}</span>
                <span>{a.score}/100 <span className="text-muted-foreground">(peso {Math.round(a.weight * 100)}%)</span></span>
              </div>
              <Progress value={a.score} className="mt-1 h-1.5" />
              {a.detail && <p className="mt-1 text-muted-foreground">{a.detail}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </Section>
  );
});
