import { memo } from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InboxInsight } from "../types";

const KIND_STYLES: Record<InboxInsight["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  warning: { icon: AlertTriangle, tone: "text-amber-600 dark:text-amber-400" },
  info: { icon: Info, tone: "text-primary" },
  success: { icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-400" },
};

interface Props {
  insights: InboxInsight[];
}

function InsightsPanel({ insights }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Insights</CardTitle></CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada a destacar por enquanto.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {insights.map((i) => {
              const S = KIND_STYLES[i.kind];
              const Icon = S.icon;
              return (
                <li key={i.id} className="flex items-start gap-2 text-sm">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", S.tone)} />
                  <span>{i.message}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(InsightsPanel);
