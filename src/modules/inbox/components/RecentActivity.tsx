import { memo } from "react";
import { Link } from "react-router-dom";
import { Section } from "@/design-system";
import { formatDaysAgo } from "../utils/format";
import type { RecentActivityItem } from "../types";

const KIND_LABEL: Record<RecentActivityItem["kind"], string> = {
  created: "Criou",
  status_changed: "Mudou status",
  assigned: "Recebeu atribuição",
  commented: "Comentou",
  approved: "Aprovou",
  qa: "QA",
};

/** DS 3.0 — timeline minimalista: sem card, poucas linhas, muito respiro. */
function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <Section title="Recentes">
      {items.length === 0 ? (
        <p className="ds-caption text-muted-foreground">Sem atividade recente.</p>
      ) : (
        <ul className="divide-y divide-border/50 border-y border-border/50" role="list">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 ds-caption">
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{KIND_LABEL[a.kind]} · </span>
                {a.href ? (
                  <Link to={a.href} className="hover:underline">
                    {a.title}
                  </Link>
                ) : (
                  a.title
                )}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{formatDaysAgo(a.when)}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default memo(RecentActivity);
