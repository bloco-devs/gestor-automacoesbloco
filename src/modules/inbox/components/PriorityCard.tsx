import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDaysAgo } from "../utils/format";
import type { RankedInboxItem } from "../types";

interface Props {
  item: RankedInboxItem;
}

function PriorityCard({ item }: Props) {
  const navigate = useNavigate();
  return (
    <Card className="border-primary/40 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Prioridade agora</span>
          <Badge variant="secondary" className="tabular-nums">score {item.score}</Badge>
        </div>
        <CardTitle className="text-lg">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {item.system && <Badge variant="outline">{item.system}</Badge>}
          <StatusBadge status={item.status} />
          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{item.responsibleName ?? item.requesterName}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />parado {formatDaysAgo(item.updatedAt)}</span>
          {item.sla && <Badge variant="outline">SLA {new Date(item.sla).toLocaleDateString()}</Badge>}
        </div>
        {item.reasons.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {item.reasons.slice(0, 3).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        <div>
          <Button size="sm" onClick={() => navigate(item.href)} aria-label={`Continuar em ${item.title}`}>
            Continuar <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(PriorityCard);
