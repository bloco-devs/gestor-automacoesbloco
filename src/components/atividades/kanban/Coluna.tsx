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
import type {
  AtividadeCard,
  AtividadeColuna,
  AtividadeLabel,
  AtividadePersona,
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
    onNew,
    onEdit,
    onOpenDraft,
    onDeleteDraft,
  } = props;
  const { isOver, setNodeRef } = useDroppable({ id: coluna.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border bg-muted/40 p-2 flex flex-col min-h-[400px] max-h-[calc(100vh-220px)] transition-colors",
        isOver ? "border-accent bg-accent/10" : "border-border/60",
      )}
    >
      <div className="flex items-center justify-between mb-2 px-2 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{coluna.nome}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
        </div>
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
