import { useMemo } from "react";
import { AlertTriangle, MoreHorizontal, Paperclip, Trash2, User } from "lucide-react";
import { hasIgnoredSuggestion } from "@/modules/ecossistema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PRIORITY_META,
  STATUS_COLUMNS,
  TYPE_META,
  type Demand,
  type DemandStatus,
} from "../types";
import { SLAIndicator } from "./SLAIndicator";

interface Props {
  demand: Demand;
  onStatusChange: (status: DemandStatus) => void;
  onDelete: () => void;
  onOpen: () => void;
  canDelete: boolean;
}

export function DemandCard({ demand, onStatusChange, onDelete, onOpen, canDelete }: Props) {
  const priority = PRIORITY_META[demand.priority];
  const type = TYPE_META[demand.type];
  const initial = useMemo(
    () => (demand.assigned_to ? demand.assigned_to.slice(0, 2).toUpperCase() : null),
    [demand.assigned_to],
  );
  const ignoredSuggestion = useMemo(() => hasIgnoredSuggestion(demand.id), [demand.id]);

  return (
    <Card
      className="p-3 space-y-2 hover:shadow-md transition-shadow group cursor-pointer"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug line-clamp-3 flex-1">
          {demand.title}
        </h4>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 group-hover:opacity-100"
              aria-label="Ações"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canDelete && (
              <>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={onDelete}
                >
                  <Trash2 className="size-3.5 mr-2" /> Excluir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem disabled>
              Criada em {new Date(demand.created_at).toLocaleDateString("pt-BR")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className={cn("text-[10px] font-medium", priority.className)}>
          {priority.label}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px] font-medium", type.className)}>
          {type.label}
        </Badge>
        <SLAIndicator
          slaDueAt={demand.sla_due_at}
          slaStatus={demand.sla_status}
          demandStatus={demand.status}
          createdAt={demand.created_at}
        />
      </div>

      <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {(demand.attachments_count ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3" />
              {demand.attachments_count}
            </span>
          )}
          {initial && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              <span className="uppercase">{initial}</span>
            </span>
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
        <Select value={demand.status} onValueChange={(v) => onStatusChange(v as DemandStatus)}>
          <SelectTrigger className="h-6 w-32 text-[11px] border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_COLUMNS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        </div>
      </div>
    </Card>
  );
}
