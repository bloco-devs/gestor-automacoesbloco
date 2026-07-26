import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDaysAgo } from "../utils/format";
import type { RankedInboxItem } from "../types";

interface Props {
  item: RankedInboxItem;
}

/**
 * DS 3.0 — cada tarefa deixou de ser um mini-card (borda + fundo + radius)
 * dentro de outro card. Agora é uma linha de lista: hover suave, hairline
 * como separador, densidade de leitura no lugar de decoração.
 */
function TaskCard({ item }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(item.href)}
      className="w-full rounded-md px-2 py-3 text-left transition-colors duration-fast ease-standard hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`Abrir ${item.title}`}
    >
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="ds-caption shrink-0 font-mono tabular-nums text-muted-foreground/70">
          {item.score.toString().padStart(3, "0")}
        </span>
        <span className="ds-body-strong truncate">{item.title}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 ds-caption text-muted-foreground">
        <StatusBadge status={item.status} />
        {item.system ? <Badge>{item.system}</Badge> : null}
        {item.sprint ? <Badge>{item.sprint}</Badge> : null}
        {item.tags.slice(0, 2).map((t) => (
          <Badge key={t}>{t}</Badge>
        ))}
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {formatDaysAgo(item.updatedAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" aria-hidden />
          {item.responsibleName ?? item.requesterName}
        </span>
      </div>
    </button>
  );
}

export default memo(TaskCard);
