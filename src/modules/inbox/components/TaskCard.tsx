import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDaysAgo } from "../utils/format";
import { cn } from "@/lib/utils";
import type { RankedInboxItem } from "../types";

interface Props {
  item: RankedInboxItem;
}

function TaskCard({ item }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(item.href)}
      className={cn(
        "w-full text-left rounded-lg border border-border/60 bg-card p-3 transition",
        "hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={`Abrir ${item.title}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
              {item.score.toString().padStart(3, "0")}
            </span>
            <span className="text-sm font-medium truncate">{item.title}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={item.status} />
            {item.system && <Badge variant="outline">{item.system}</Badge>}
            {item.sprint && <Badge variant="secondary">{item.sprint}</Badge>}
            {item.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="outline" className="font-normal">{t}</Badge>
            ))}
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDaysAgo(item.updatedAt)}</span>
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{item.responsibleName ?? item.requesterName}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(TaskCard);
