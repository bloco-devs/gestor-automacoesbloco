import { memo } from "react";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Section } from "@/design-system";
import type { InboxInsight } from "../types";

/**
 * DS 3.0 — cores vindas dos tokens semânticos (warning/info/success) em vez de
 * `amber-600 dark:amber-400` cravado no componente. Isso mantém o tema
 * consistente em claro e escuro sem duplicar regra de cor.
 */
const KIND_STYLES: Record<InboxInsight["kind"], { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  warning: { icon: AlertTriangle, tone: "text-warning" },
  info: { icon: Info, tone: "text-info" },
  success: { icon: CheckCircle2, tone: "text-success" },
};

interface Props {
  insights: InboxInsight[];
}

function InsightsPanel({ insights }: Props) {
  return (
    <Section title="Insights">
      {insights.length === 0 ? (
        <p className="ds-caption text-muted-foreground">Nada a destacar por enquanto.</p>
      ) : (
        <ul className="space-y-2.5" role="list">
          {insights.map((i) => {
            const S = KIND_STYLES[i.kind];
            const Icon = S.icon;
            return (
              <li key={i.id} className="flex items-start gap-2 ds-caption">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", S.tone)} aria-hidden />
                <span className="text-muted-foreground">{i.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export default memo(InsightsPanel);
