import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Link2, CheckSquare, AlignLeft, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  listColunas,
  listCards,
  listPersonas,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  type AtividadeColuna,
  type AtividadeCard,
  type AtividadePersona,
  type ChecklistItem,
  type CardLink,
} from "@/lib/atividades";
import { listAssignableUsers, listSolucoes } from "@/lib/supabaseData";
import type { AssignableUser, Solucao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardDialog, type CardDraftValues } from "@/components/atividades/CardDialog";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";


function initials(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

interface ResponsavelDisplay {
  id: string;
  nome: string;
}

function buildResponsaveisDisplay(
  card: AtividadeCard,
  responsaveisMap: Map<string, AssignableUser>,
  personasMap: Map<string, AtividadePersona>,
  personasByUser: Map<string, AtividadePersona[]>,
): ResponsavelDisplay[] {
  const result: ResponsavelDisplay[] = [];
  const usersCoveredByPersona = new Set<string>();
  for (const pid of card.responsavelPersonaIds) {
    const p = personasMap.get(pid);
    if (!p) continue;
    result.push({ id: `p:${p.id}`, nome: p.nome });
    usersCoveredByPersona.add(p.userId);
  }
  for (const uid of card.responsavelIds) {
    if (usersCoveredByPersona.has(uid)) continue;
    const u = responsaveisMap.get(uid);
    if (!u) continue;
    // Se o usuário tem personas mas nenhuma marcada, mostra o nome do usuário
    const userPersonas = personasByUser.get(uid) ?? [];
    if (userPersonas.length > 0) {
      result.push({ id: `u:${uid}`, nome: u.nome });
    } else {
      result.push({ id: `u:${uid}`, nome: u.nome });
    }
  }
  return result;
}

export default function Atividades() {
  const { user } = useAuth();
  const [colunas, setColunas] = useState<AtividadeColuna[]>([]);
  const [cards, setCards] = useState<AtividadeCard[]>([]);
  const [responsaveis, setResponsaveis] = useState<AssignableUser[]>([]);
  const [personas, setPersonas] = useState<AtividadePersona[]>([]);
  const [solucoes, setSolucoes] = useState<Solucao[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AtividadeCard | null>(null);
  const [newCardColuna, setNewCardColuna] = useState<string | null>(null);

  // Rascunhos locais (não persistidos)
  type Draft = { id: string; colunaId: string; data: CardDraftValues };
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const editingDraft = drafts.find((d) => d.id === editingDraftId) ?? null;

  // Filtros
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [filterSolucaoIds, setFilterSolucaoIds] = useState<string[]>([]);
  const hasFilters = filterUserIds.length > 0 || filterSolucaoIds.length > 0;

  useEffect(() => {
    (async () => {
      try {
        const [cs, cds, us, ss, ps] = await Promise.all([
          listColunas(),
          listCards(),
          listAssignableUsers(),
          listSolucoes(),
          listPersonas(),
        ]);
        setColunas(cs);
        setCards(cds);
        setResponsaveis(us);
        setSolucoes(ss);
        setPersonas(ps);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar atividades");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const cardsByColuna = useMemo(() => {
    const map: Record<string, AtividadeCard[]> = {};
    for (const c of colunas) map[c.id] = [];
    for (const card of cards) {
      if (!map[card.colunaId]) continue;
      if (filterUserIds.length > 0) {
        const ids = card.responsavelIds.length ? card.responsavelIds : card.responsavelId ? [card.responsavelId] : [];
        if (!ids.some((id) => filterUserIds.includes(id))) continue;
      }
      if (filterSolucaoIds.length > 0) {
        if (!card.solucaoId || !filterSolucaoIds.includes(card.solucaoId)) continue;
      }
      map[card.colunaId].push(card);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.ordem - b.ordem || a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [cards, colunas, filterUserIds, filterSolucaoIds]);

  const responsaveisMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u])),
    [responsaveis],
  );
  const solucoesMap = useMemo(
    () => new Map(solucoes.map((s) => [s.id, s])),
    [solucoes],
  );
  const personasMap = useMemo(
    () => new Map(personas.map((p) => [p.id, p])),
    [personas],
  );
  const personasByUser = useMemo(() => {
    const m = new Map<string, AtividadePersona[]>();
    for (const p of personas) {
      const arr = m.get(p.userId) ?? [];
      arr.push(p);
      m.set(p.userId, arr);
    }
    return m;
  }, [personas]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function findColuna(id: string): string | null {
    // It's a card id?
    const c = cards.find((x) => x.id === id);
    if (c) return c.colunaId;
    // It's a column droppable (id === coluna.id)?
    if (colunas.some((col) => col.id === id)) return id;
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const activeColuna = findColuna(activeId);
    const overColuna = findColuna(overId);
    if (!activeColuna || !overColuna || activeColuna === overColuna) return;

    setCards((cs) => {
      const active = cs.find((c) => c.id === activeId);
      if (!active) return cs;
      const without = cs.filter((c) => c.id !== activeId);
      const overIsCard = cs.some((c) => c.id === overId);
      const moved: AtividadeCard = { ...active, colunaId: overColuna };
      if (overIsCard) {
        const idx = without.findIndex((c) => c.id === overId);
        return [...without.slice(0, idx), moved, ...without.slice(idx)];
      }
      return [...without, moved];
    });
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const active = cards.find((c) => c.id === activeId);
    if (!active) return;
    const overColuna = findColuna(overId);
    if (!overColuna) return;

    const colCards = cards
      .filter((c) => c.colunaId === overColuna)
      .sort((a, b) => a.ordem - b.ordem);

    const oldIdx = colCards.findIndex((c) => c.id === activeId);
    let newIdx = oldIdx;
    if (overId !== overColuna) {
      newIdx = colCards.findIndex((c) => c.id === overId);
      if (newIdx === -1) newIdx = colCards.length - 1;
    } else {
      newIdx = colCards.length - 1;
    }

    const reordered =
      oldIdx === -1 ? colCards : arrayMove(colCards, oldIdx, newIdx);

    const prev = cards;
    const updates = reordered.map((c, i) => ({
      id: c.id,
      colunaId: overColuna,
      ordem: i,
    }));

    setCards((cs) =>
      cs.map((c) => {
        const u = updates.find((x) => x.id === c.id);
        return u ? { ...c, colunaId: u.colunaId, ordem: u.ordem } : c;
      }),
    );

    try {
      await reorderCards(updates);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível reordenar os cards");
      setCards(prev);
    }
  }


  function openNew(colunaId: string) {
    setEditing(null);
    setEditingDraftId(null);
    setNewCardColuna(colunaId);
    setDialogOpen(true);
  }
  function openEdit(card: AtividadeCard) {
    setEditing(card);
    setEditingDraftId(null);
    setNewCardColuna(null);
    setDialogOpen(true);
  }
  function openDraft(draft: Draft) {
    setEditing(null);
    setEditingDraftId(draft.id);
    setNewCardColuna(draft.colunaId);
    setDialogOpen(true);
  }

  function handleSaveDraft(data: CardDraftValues) {
    if (!newCardColuna) return;
    if (editingDraftId) {
      setDrafts((ds) =>
        ds.map((d) => (d.id === editingDraftId ? { ...d, data } : d)),
      );
    } else {
      const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setDrafts((ds) => [...ds, { id, colunaId: newCardColuna, data }]);
    }
    toast.success("Rascunho salvo na coluna");
  }

  function handleDiscardDraft() {
    if (editingDraftId) {
      setDrafts((ds) => ds.filter((d) => d.id !== editingDraftId));
    }
  }

  function handleDeleteDraft(draftId: string) {
    setDrafts((ds) => ds.filter((d) => d.id !== draftId));
  }

  async function handleSubmit(data: CardDraftValues) {
    try {
      if (editing) {
        await updateCard(editing.id, data);
        setCards((cs) => cs.map((c) => (c.id === editing.id ? { ...c, ...data } : c)));
        toast.success("Card atualizado");
      } else if (newCardColuna) {
        const created = await createCard({
          colunaId: newCardColuna,
          titulo: data.titulo,
          descricao: data.descricao,
          responsavelIds: data.responsavelIds,
          responsavelPersonaIds: data.responsavelPersonaIds,
          solucaoId: data.solucaoId,
          checklist: data.checklist,
          links: data.links,
          createdBy: user?.id,
          ordem: (cardsByColuna[newCardColuna]?.length ?? 0) + 1,
        });
        setCards((cs) => [...cs, created]);
        if (editingDraftId) {
          setDrafts((ds) => ds.filter((d) => d.id !== editingDraftId));
        }
        toast.success("Card criado");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar card");
      throw e;
    }
  }

  async function toggleChecklistItem(cardId: string, itemId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const next = card.checklist.map((i) =>
      i.id === itemId ? { ...i, concluido: !i.concluido } : i,
    );
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, checklist: next } : c)));
    try {
      await updateCard(cardId, { checklist: next });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar checklist");
      setCards(prev);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    try {
      await deleteCard(editing.id);
      setCards((cs) => cs.filter((c) => c.id !== editing.id));
      toast.success("Card excluído");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Atividades</h1>
          <p className="text-sm text-muted-foreground">
            Quadro Kanban da equipe de tecnologia. Arraste os cards entre as colunas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterPopover
            label="Responsável"
            items={responsaveis.map((u) => ({ id: u.id, label: u.nome }))}
            selected={filterUserIds}
            onChange={setFilterUserIds}
          />
          <FilterPopover
            label="Solução"
            items={solucoes.map((s) => ({ id: s.id, label: s.titulo }))}
            selected={filterSolucaoIds}
            onChange={setFilterSolucaoIds}
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterUserIds([]);
                setFilterSolucaoIds([]);
              }}
            >
              <X className="size-3.5" /> Limpar
            </Button>
          )}
        </div>
      </div>


      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 min-w-0 basis-0 space-y-2 rounded-lg border bg-card p-3">
              <SkeletonAt className="h-4 w-1/2" />
              <SkeletonAt className="h-16 w-full" />
              <SkeletonAt className="h-16 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-3 overflow-x-auto pb-3">
            {colunas.map((col) => (
              <div key={col.id} className="flex-1 min-w-0 basis-0">
                <Coluna
                  coluna={col}
                  cards={cardsByColuna[col.id] ?? []}
                  drafts={drafts.filter((d) => d.colunaId === col.id)}
                  responsaveisMap={responsaveisMap}
                  personasMap={personasMap}
                  personasByUser={personasByUser}
                  solucoesMap={solucoesMap}
                  currentUserId={user?.id ?? null}
                  onNew={() => openNew(col.id)}
                  onEdit={openEdit}
                  onOpenDraft={openDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onToggleChecklist={toggleChecklistItem}
                />
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                responsaveis={buildResponsaveisDisplay(
                  activeCard,
                  responsaveisMap,
                  personasMap,
                  personasByUser,
                )}
                solucao={
                  activeCard.solucaoId
                    ? solucoesMap.get(activeCard.solucaoId)
                    : undefined
                }
                isMine={!!user?.id && activeCard.responsavelIds.includes(user.id)}
                onEdit={() => {}}
                onToggleChecklist={() => {}}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>

      )}

      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultValues={editingDraft?.data ?? null}
        responsaveis={responsaveis}
        personas={personas}
        solucoes={solucoes}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        onSaveDraft={!editing ? handleSaveDraft : undefined}
        onDiscardDraft={!editing ? handleDiscardDraft : undefined}
      />
    </div>
  );
}

function Coluna({
  coluna,
  cards,
  drafts,
  responsaveisMap,
  personasMap,
  personasByUser,
  solucoesMap,
  currentUserId,
  onNew,
  onEdit,
  onOpenDraft,
  onDeleteDraft,
  onToggleChecklist,
}: {
  coluna: AtividadeColuna;
  cards: AtividadeCard[];
  drafts: { id: string; colunaId: string; data: CardDraftValues }[];
  responsaveisMap: Map<string, AssignableUser>;
  personasMap: Map<string, AtividadePersona>;
  personasByUser: Map<string, AtividadePersona[]>;
  solucoesMap: Map<string, Solucao>;
  currentUserId: string | null;
  onNew: () => void;
  onEdit: (c: AtividadeCard) => void;
  onOpenDraft: (d: { id: string; colunaId: string; data: CardDraftValues }) => void;
  onDeleteDraft: (id: string) => void;
  onToggleChecklist: (cardId: string, itemId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: coluna.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card p-3 flex flex-col min-h-[400px] transition-colors",
        isOver ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">{coluna.nome}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {cards.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onNew}
          title="Adicionar card"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 flex-1">
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
              isMine={!!currentUserId && card.responsavelIds.includes(currentUserId)}
              onEdit={() => onEdit(card)}
              onToggleChecklist={onToggleChecklist}
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
        </div>
      </SortableContext>

    </div>
  );
}

function DraftCard({
  draft,
  onOpen,
  onDelete,
}: {
  draft: { id: string; colunaId: string; data: CardDraftValues };
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { titulo, descricao, checklist } = draft.data;
  return (
    <div
      onClick={onOpen}
      className="group relative rounded-md border border-dashed border-accent/40 bg-accent/5 p-3 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
      title="Rascunho — clique para continuar editando"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-accent font-medium">
          Rascunho
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Descartar
        </button>
      </div>
      <div className="mt-1 text-sm font-medium leading-snug line-clamp-2">
        {titulo || <span className="italic text-muted-foreground">Sem título</span>}
      </div>
      {descricao && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
          {descricao}
        </p>
      )}
      {checklist.length > 0 && (
        <div className="mt-1.5 text-[10px] text-muted-foreground">
          {checklist.filter((c) => c.concluido).length}/{checklist.length} itens
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  card,
  responsaveis,
  solucao,
  isMine,
  onEdit,
  onToggleChecklist,
  isOverlay,
}: {
  card: AtividadeCard;
  responsaveis: ResponsavelDisplay[];
  solucao?: Solucao;
  isMine?: boolean;
  onEdit: () => void;
  onToggleChecklist: (cardId: string, itemId: string) => void;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: isOverlay });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const checklistTotal = card.checklist.length;
  const checklistDone = card.checklist.filter((c) => c.concluido).length;

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
        "group rounded-md border bg-background p-3 cursor-grab active:cursor-grabbing transition-shadow hover:border-accent/50",
        isMine
          ? "border-yellow-400/70 ring-2 ring-yellow-400/60 shadow-[0_0_10px_rgba(250,204,21,0.35)]"
          : "border-border",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "shadow-lg ring-1 ring-accent/40",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 text-sm font-medium leading-snug line-clamp-3 group-hover:text-accent transition-colors">
          {card.titulo}
        </div>
        {responsaveis.length > 0 && (

          <div className="flex -space-x-1.5 shrink-0">
            {responsaveis.slice(0, 3).map((r) => (
              <Avatar
                key={r.id}
                className="size-5 ring-1 ring-background"
                title={r.nome}
              >
                <AvatarFallback className="text-[9px]">
                  {initials(r.nome)}
                </AvatarFallback>
              </Avatar>
            ))}
            {responsaveis.length > 3 && (
              <div
                className="size-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[9px] text-muted-foreground"
                title={responsaveis
                  .slice(3)
                  .map((r) => r.nome)
                  .join(", ")}
              >
                +{responsaveis.length - 3}
              </div>
            )}
          </div>
        )}
      </div>


      {(card.descricao || checklistTotal > 0 || card.links.length > 0 || solucao) && (
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
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
                checklistDone === checklistTotal && "text-accent",
              )}
            >
              <CheckSquare className="size-3" />
              {checklistDone}/{checklistTotal}
            </span>
          )}
          {card.links.length > 0 && (
            <span
              title={`${card.links.length} link(s)`}
              className="flex items-center gap-0.5 tabular-nums"
            >
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
      )}
    </div>
  );
}

function FilterPopover({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={selected.length > 0 ? "secondary" : "outline"} size="sm">
          <Filter className="size-3.5" />
          {label}
          {selected.length > 0 && (
            <span className="ml-1 rounded-full bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 tabular-nums">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">Filtrar por {label.toLowerCase()}</span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto mt-1">
          {items.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum item disponível</div>
          ) : (
            items.map((it) => (
              <label
                key={it.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent/10 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(it.id)}
                  onCheckedChange={() => toggle(it.id)}
                />
                <span className="text-sm truncate">{it.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
