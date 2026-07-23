import { memo } from "react";
import { Section } from "@/design-system";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FEATURE_TIMELINE } from "../catalog/features";

const STATUS_TONE: Record<string, string> = {
  shipped: "bg-success/10 text-success",
  "in-progress": "bg-info/10 text-info",
  planned: "bg-muted text-muted-foreground",
};

export const FeatureTimelinePanel = memo(function FeatureTimelinePanel() {
  return (
    <Section title="Feature Timeline" description="Histórico oficial de entregas e dependências.">
      <Card className="surface-1">
        <CardContent className="pt-4">
          <ol className="relative border-l pl-4">
            {FEATURE_TIMELINE.map((f) => (
              <li key={f.id} className="mb-3 last:mb-0">
                <span className="absolute -left-1.5 h-3 w-3 rounded-full border bg-background" aria-hidden />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">#{f.id}</span>
                  <span className="font-medium text-foreground">{f.name}</span>
                  <Badge className={`text-[10px] ${STATUS_TONE[f.status] ?? ""}`} variant="outline">
                    {f.status}
                  </Badge>
                  {f.depends && f.depends.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      depende de {f.depends.map((d) => `#${d}`).join(", ")}
                    </span>
                  )}
                </div>
                {f.doc && <div className="text-[11px] text-muted-foreground">{f.doc}</div>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </Section>
  );
});
