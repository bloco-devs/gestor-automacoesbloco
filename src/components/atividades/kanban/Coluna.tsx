import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, MoreHorizontal, Pencil, Copy, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  colunaAccent,
  type AtividadeCard,
  type AtividadeColuna,
  type AtividadeLabel,
  type AtividadePersona,
} from "@/lib/atividades";

import type { AssignableUser, Solucao } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { DraftCard, type Draft } from "./DraftCard";
import { buildResponsaveisDisplay } from "./helpers";

interface ColunaProps {
  coluna: AtividadeColuna;
  cards: AtividadeCard[];
  drafts: Draft[];
  responsaveisMap: Map<string, AssignableUser>;
  personasMap: Map<string, AtividadePersona>;
  personasByUser: Map<string, AtividadePersona[]>;
  solucoesMap: Map<string, Solucao>;
  labelsMap: Map<string, AtividadeLabel>;
  anexosCounts?: Map<string, number>;
  currentUserId: string | null;
  canAdmin?: boolean;
  onNew: () => void;
  onEdit: (c: AtividadeCard) => void;
  onOpenDraft: (d: Draft) => void;
  onDeleteDraft: (id: string) => void;
  onRename?: (coluna: AtividadeColuna) => void;
  onDuplicate?: (coluna: AtividadeColuna) => void;
  onArchive?: (coluna: AtividadeColuna) => void;
  onDelete?: (coluna: AtividadeColuna) => void;
}


function ColunaImpl(props: ColunaProps) {
  const {
    coluna,
    cards,
    drafts,
    responsaveisMap,
    personasMap,
    personasByUser,
    solucoesMap,
    labelsMap,
    anexosCounts,
    currentUserId,
    canAdmin,
    onNew,
    onEdit,
    onOpenDraft,
    onDeleteDraft,
    onRename,
    onDuplicate,
    onArchive,
    onDelete,
  } = props;
  const { isOver, setNodeRef } = useDroppable({ id: coluna.id });
  const showMenu = canAdmin && (onRename || onDuplicate || onArchive || onDelete);
  const accent = colunaAccent(coluna.nome, coluna.ordem ?? 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border p-2 flex flex-col min-h-[400px] max-h-[calc(100vh-220px)] transition-colors overflow-hidden shadow-sm",
        accent.column,
        isOver && "ring-2 ring-accent",
      )}
    >
      <div className={cn("h-1 -mx-2 -mt-2 mb-2", accent.bar)} />
      <div
        className={cn(
          "flex items-center justify-between mb-2 px-2 py-1.5 rounded-md",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold truncate">{coluna.nome}</h3>
          {(() => {
            const wip = coluna.wipLimit ?? 0;
            const count = cards.length;
            const over = wip > 0 && count > wip;
            const at = wip > 0 && count === wip;
            return (
              <span
                className={cn(
                  "text-xs tabular-nums rounded px-1.5 py-0.5",
                  over
                    ? "bg-destructive/15 text-destructive font-medium"
                    : at
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium"
                      : "text-muted-foreground",
                )}
                title={wip > 0 ? `Limite de WIP: ${wip}` : undefined}
              >
                {count}
                {wip > 0 ? ` / ${wip}` : ""}
              </span>
            );
          })()}
        </div>

        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onNew}
            title="Adicionar card"
            aria-label={`Adicionar card em ${coluna.nome}`}
          >
            <Plus className="size-4" />
          </Button>
          {showMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Ações da coluna ${coluna.nome}`}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onRename && (
                  <DropdownMenuItem onSelect={() => onRename(coluna)}>
                    <Pencil className="size-3.5 mr-2" /> Renomear
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onSelect={() => onDuplicate(coluna)}>
                    <Copy className="size-3.5 mr-2" /> Duplicar
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem onSelect={() => onArchive(coluna)}>
                    <Archive className="size-3.5 mr-2" /> Arquivar
                  </DropdownMenuItem>
                )}
                {onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    onSelect={() => onDelete(coluna)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1 overflow-y-auto px-1 pb-1">
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              responsaveis={buildResponsaveisDisplay(
                card,
                responsaveisMap,
                personasMap,
                personasByUser,
              )}
              solucao={card.solucaoId ? solucoesMap.get(card.solucaoId) : undefined}
              labelsMap={labelsMap}
              isMine={!!currentUserId && card.responsavelIds.includes(currentUserId)}
              anexosCount={anexosCounts?.get(card.id) ?? 0}
              onEdit={() => onEdit(card)}
            />
          ))}

          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onOpen={() => onOpenDraft(draft)}
              onDelete={() => onDeleteDraft(draft.id)}
            />
          ))}

          {cards.length === 0 && drafts.length === 0 && (
            <button
              type="button"
              onClick={onNew}
              className="w-full rounded-lg border border-dashed border-border/60 py-6 text-xs text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
            >
              <Plus className="size-3.5 inline mr-1" /> Adicionar card
            </button>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export const Coluna = memo(ColunaImpl);
