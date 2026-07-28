import { memo, useMemo } from "react";
import { AlertTriangle, Info, TriangleAlert } from "lucide-react";
import { Section } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { computeHealthFindings } from "../health/heuristics";

const ICONS = {
  info: Info,
  warn: TriangleAlert,
  error: AlertTriangle,
} as const;

export const CodeHealthPanel = memo(function CodeHealthPanel() {
  const findings = useMemo(() => computeHealthFindings(), []);
  return (
    <Section title="Code Health" description="Achados heurísticos derivados do inventário. Somente leitura.">
      <Card className="surface-1">
        <CardContent className="pt-4 space-y-1.5 text-sm">
          {findings.map((f) => {
            const Icon = ICONS[f.severity];
            return (
              <div key={f.id} className="flex items-start gap-2">
                <Icon className={
                  f.severity === "error"
                    ? "mt-0.5 size-4 text-destructive"
                    : f.severity === "warn"
                    ? "mt-0.5 size-4 text-warning"
                    : "mt-0.5 size-4 text-muted-foreground"
                } aria-hidden />
                <span className="min-w-0">
                  <span className="text-foreground">{f.message}</span>
                  {f.path && <span className="ml-1 text-[11px] text-muted-foreground">{f.path}</span>}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Section>
  );
});
