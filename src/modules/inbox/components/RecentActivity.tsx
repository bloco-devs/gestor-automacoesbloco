import { memo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Props {
  items: RecentActivityItem[];
}

function RecentActivity({ items }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Recentes</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem atividade recente.</p>
        ) : (
          <ul className="space-y-2" role="list">
            {items.map((a) => (
              <li key={a.id} className="text-sm flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  <span className="text-muted-foreground">{KIND_LABEL[a.kind]} · </span>
                  {a.href ? (
                    <Link to={a.href} className="hover:underline">{a.title}</Link>
                  ) : a.title}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{formatDaysAgo(a.when)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(RecentActivity);
