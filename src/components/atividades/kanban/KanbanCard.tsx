import { memo } from "react";
import { Link } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlignLeft,
  CalendarIcon,
  CheckCircle2,
  CheckSquare,
  Flag,
  Link as LinkIcon,
  Link2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  coverColorClass,
  labelColorClass,
  prazoStatus,
  PRIORIDADE_META,
  type AtividadeCard,
  type AtividadeLabel,
} from "@/lib/atividades";
import type { Solucao } from "@/lib/types";
import { initials, type ResponsavelDisplay } from "./helpers";

interface KanbanCardProps {
  card: AtividadeCard;
  responsaveis: ResponsavelDisplay[];
  solucao?: Solucao;
  labelsMap: Map<string, AtividadeLabel>;
  isMine?: boolean;
  onEdit: () => void;
  isOverlay?: boolean;
}

function KanbanCardImpl({
  card,
  responsaveis,
  solucao,
  labelsMap,
  isMine,
  onEdit,
  isOverlay,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, disabled: isOverlay });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const checklistTotal = card.checklist.length;
  const checklistDone = card.checklist.filter((c) => c.concluido).length;
  const progressPct =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const cardLabels = card.labelIds
    .map((id) => labelsMap.get(id))
    .filter((l): l is AtividadeLabel => !!l);
  const status = prazoStatus(card);

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={(e) => {
        if (isDragging || isOverlay) return;
        e.stopPropagation();
        onEdit();
      }}
      className={cn(
        "group rounded-xl border bg-card cursor-grab active:cursor-grabbing transition-all overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5",
        isMine
          ? "border-yellow-400/70 ring-2 ring-yellow-400/40"
          : "border-border/70 hover:border-accent/50",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "shadow-lg ring-1 ring-accent/40 rotate-2 scale-105",
        card.concluido && "opacity-70",
      )}
    >
      {card.coverCor && <div className={cn("h-2 w-full", coverColorClass(card.coverCor))} />}
      <div className="p-3 space-y-2">
        {cardLabels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cardLabels.map((l) => (
              <span
                key={l.id}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                  labelColorClass(l.cor),
                )}
                title={l.nome}
              >
                {l.nome}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2">
          <div
            className={cn(
              "flex-1 min-w-0 text-sm font-medium leading-snug line-clamp-3 group-hover:text-accent transition-colors",
              card.concluido && "line-through text-muted-foreground",
            )}
          >
            {card.concluido && (
              <CheckCircle2 className="inline size-3.5 text-emerald-500 mr-1 -mt-0.5" />
            )}
            {card.titulo}
          </div>
          {responsaveis.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {responsaveis.slice(0, 3).map((r) => (
                <Avatar key={r.id} className="size-5 ring-1 ring-background" title={r.nome}>
                  <AvatarFallback className="text-[9px]">{initials(r.nome)}</AvatarFallback>
                </Avatar>
              ))}
              {responsaveis.length > 3 && (
                <div
                  className="size-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[9px] text-muted-foreground"
                  title={responsaveis.slice(3).map((r) => r.nome).join(", ")}
                >
                  +{responsaveis.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {checklistTotal > 0 && <Progress value={progressPct} className="h-1" />}

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
          {card.dataEntrega && (
            <span
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded border",
                status === "atrasado" &&
                  "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
                status === "hoje" &&
                  "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/40",
                status === "em-breve" &&
                  "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
                status === "no-prazo" && "bg-muted text-foreground border-border",
                status === "concluido" &&
                  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
              )}
              title={format(new Date(card.dataEntrega), "PPP", { locale: ptBR })}
            >
              <CalendarIcon className="size-3" />
              {format(new Date(card.dataEntrega), "dd MMM", { locale: ptBR })}
            </span>
          )}
          {card.prioridade && (
            <span
              className={cn(
                "flex items-center gap-1",
                PRIORIDADE_META[card.prioridade].className,
              )}
              title={`Prioridade: ${PRIORIDADE_META[card.prioridade].label}`}
            >
              <Flag className="size-3" />
              {PRIORIDADE_META[card.prioridade].label}
            </span>
          )}
          {card.descricao && (
            <span title="Possui descrição" className="flex items-center">
              <AlignLeft className="size-3" />
            </span>
          )}
          {checklistTotal > 0 && (
            <span
              title={`Checklist: ${checklistDone}/${checklistTotal}`}
              className={cn(
                "flex items-center gap-0.5 tabular-nums",
                checklistDone === checklistTotal &&
                  "text-emerald-600 dark:text-emerald-400",
              )}
            >
              <CheckSquare className="size-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {card.links.length > 0 && (
            <span title={`${card.links.length} link(s)`} className="flex items-center gap-0.5 tabular-nums">
              <LinkIcon className="size-3" />
              {card.links.length}
            </span>
          )}
          {solucao && (
            <Link
              to={`/solucoes/${solucao.id}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title={`Solução: ${solucao.titulo}`}
              className="flex items-center hover:text-accent ml-auto"
            >
              <Link2 className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export const KanbanCard = memo(KanbanCardImpl);
