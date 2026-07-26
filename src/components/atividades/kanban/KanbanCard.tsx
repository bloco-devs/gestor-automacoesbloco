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
  Paperclip,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  coverColorClass,
  coverColorStyle,
  labelColorClass,
  labelColorStyle,
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
  anexosCount?: number;
  onEdit: () => void;
  isOverlay?: boolean;
}

function KanbanCardImpl({
  card,
  responsaveis,
  solucao,
  labelsMap,
  isMine,
  anexosCount = 0,
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
      
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      onClick={(e) => {
        if (isDragging || isOverlay) return;
        e.stopPropagation();
        onEdit();
      }}
      style={isOverlay ? undefined : style}
      className={cn(
        // DS 3.1 — o card do quadro e o objeto que o usuario literalmente pega,
        // entao aqui a profundidade e funcional, nao decorativa: repouso elevado
        // (elev-2 + fio de luz), lift no hover, e o overlay de arraste sai do
        // plano com elev-4 e inclinacao.
        "surface-raised group cursor-grab overflow-hidden rounded-lg text-card-foreground active:cursor-grabbing",
        isMine && "ring-2 ring-primary/40",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "surface-dragging cursor-grabbing",
        card.concluido && "opacity-60",
      )}

    >
      {card.coverCor && (
        <div
          className={cn("h-2 w-full", coverColorClass(card.coverCor))}
          style={coverColorStyle(card.coverCor)}
        />
      )}
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
                style={labelColorStyle(l.cor)}
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
              "line-clamp-3 min-w-0 flex-1 text-sm font-medium leading-snug",
              card.concluido && "line-through text-muted-foreground",
            )}
          >
            {card.concluido && (
              <CheckCircle2 className="-mt-0.5 mr-1 inline size-3.5 text-success" />
            )}
            {card.titulo}
          </div>
          {responsaveis.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {responsaveis.slice(0, 3).map((r) => (
                <Avatar key={r.id} className="size-5 ring-1 ring-card" title={r.nome}>
                  {r.avatarUrl && <AvatarImage src={r.avatarUrl} alt={r.nome} />}
                  <AvatarFallback className="bg-muted text-[9px] text-foreground">
                    {initials(r.nome)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {responsaveis.length > 3 && (
                <div
                  className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] text-foreground ring-1 ring-card"
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
                "flex items-center gap-1 rounded px-1.5 py-0.5",
                status === "atrasado" && "bg-destructive/12 text-destructive",
                status === "hoje" && "bg-warning/15 text-warning",
                status === "em-breve" && "bg-info/12 text-info",
                status === "no-prazo" && "bg-muted text-muted-foreground",
                status === "concluido" && "bg-success/12 text-success",
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
                checklistDone === checklistTotal && "text-success",
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
          {anexosCount > 0 && (
            <span title={`${anexosCount} anexo(s)`} className="flex items-center gap-0.5 tabular-nums">
              <Paperclip className="size-3" />
              {anexosCount}
            </span>
          )}
          {solucao && (
            <Link
              to={`/solucoes/${solucao.id}`}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title={`Solução: ${solucao.titulo}`}
              className="ml-auto flex items-center hover:text-foreground"
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
