import { memo } from "react";
import { CheckCircle2, Circle, TriangleAlert } from "lucide-react";
import { Section } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { RELEASE_CHECKLIST } from "../quality/releaseReadiness";

const ICONS = {
  ok: CheckCircle2,
  warn: TriangleAlert,
  pending: Circle,
} as const;

const TONE = {
  ok: "text-success",
  warn: "text-warning",
  pending: "text-muted-foreground",
} as const;

export const ReleaseReadinessPanel = memo(function ReleaseReadinessPanel() {
  return (
    <Section title="Release Readiness" description="Checklist automatizado por área.">
      <Card className="surface-1">
        <CardContent className="grid gap-2 pt-4 sm:grid-cols-2">
          {RELEASE_CHECKLIST.map((it) => {
            const Icon = ICONS[it.status];
            return (
              <div key={it.id} className="flex items-start gap-2 text-sm">
                <Icon className={`mt-0.5 size-4 ${TONE[it.status]}`} aria-hidden />
                <div className="min-w-0">
                  <div className="font-medium text-foreground">{it.label}</div>
                  {it.detail && <div className="text-xs text-muted-foreground">{it.detail}</div>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </Section>
  );
});
