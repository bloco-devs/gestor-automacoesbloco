import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Link2, CheckSquare, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  listColunas,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  type AtividadeColuna,
  type AtividadeCard,
  type ChecklistItem,
  type CardLink,
} from "@/lib/atividades";
import { listAssignableUsers, listSolucoes } from "@/lib/supabaseData";
import type { AssignableUser, Solucao } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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

export default function Atividades() {
  const { user } = useAuth();
  const [colunas, setColunas] = useState<AtividadeColuna[]>([]);
  const [cards, setCards] = useState<AtividadeCard[]>([]);
  const [responsaveis, setResponsaveis] = useState<AssignableUser[]>([]);
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

  useEffect(() => {
    (async () => {
      try {
        const [cs, cds, us, ss] = await Promise.all([
          listColunas(),
          listCards(),
          listAssignableUsers(),
          listSolucoes(),
        ]);
        setColunas(cs);
        setCards(cds);
        setResponsaveis(us);
        setSolucoes(ss);
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
      if (map[card.colunaId]) map[card.colunaId].push(card);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.ordem - b.ordem || a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [cards, colunas]);

  const responsaveisMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u])),
    [responsaveis],
  );
  const solucoesMap = useMemo(
    () => new Map(solucoes.map((s) => [s.id, s])),
    [solucoes],
  );

  async function handleDragEnd(e: DragEndEvent) {
    const cardId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.colunaId === overId) return;
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, colunaId: overId } : c)));
    try {
      await updateCard(cardId, { colunaId: overId });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível mover o card");
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
          responsavelId: data.responsavelId,
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
      <div>
        <h1 className="text-2xl font-semibold">Atividades</h1>
        <p className="text-sm text-muted-foreground">
          Quadro Kanban da equipe de tecnologia. Arraste os cards entre as colunas.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-3">
            {colunas.map((col) => (
              <div key={col.id} className="flex-1 min-w-0 basis-0">
                <Coluna
                  coluna={col}
                  cards={cardsByColuna[col.id] ?? []}
                  drafts={drafts.filter((d) => d.colunaId === col.id)}
                  responsaveisMap={responsaveisMap}
                  solucoesMap={solucoesMap}
                  onNew={() => openNew(col.id)}
                  onEdit={openEdit}
                  onOpenDraft={openDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onToggleChecklist={toggleChecklistItem}
                />
              </div>
            ))}
          </div>
        </DndContext>
      )}

      <CardDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        defaultValues={editingDraft?.data ?? null}
        responsaveis={responsaveis}
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
  solucoesMap,
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
  solucoesMap: Map<string, Solucao>;
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
      <div className="space-y-2 flex-1">
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            responsavel={card.responsavelId ? responsaveisMap.get(card.responsavelId) : undefined}
            solucao={card.solucaoId ? solucoesMap.get(card.solucaoId) : undefined}
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
  responsavel,
  solucao,
  onEdit,
  onToggleChecklist,
}: {
  card: AtividadeCard;
  responsavel?: AssignableUser;
  solucao?: Solucao;
  onEdit: () => void;
  onToggleChecklist: (cardId: string, itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const checklistTotal = card.checklist.length;
  const checklistDone = card.checklist.filter((c) => c.concluido).length;
  const progress = checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onEdit();
      }}
      className={cn(
        "group rounded-md border border-border bg-background p-3 cursor-grab active:cursor-grabbing transition-shadow hover:border-accent/50",
        isDragging && "shadow-lg opacity-80",
      )}
    >
      <div className="text-sm font-medium leading-snug line-clamp-3 group-hover:text-accent transition-colors">
        {card.titulo}
      </div>
      {card.descricao && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
          {card.descricao}
        </p>
      )}

      {checklistTotal > 0 && (
        <div
          className="mt-2 space-y-1.5"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckSquare className="size-3" />
            <span className="tabular-nums">
              {checklistDone}/{checklistTotal}
            </span>
            <div className="ml-1 h-1 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="space-y-0.5">
            {card.checklist.slice(0, 3).map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-1.5 text-[11px] cursor-pointer"
              >
                <Checkbox
                  checked={item.concluido}
                  onCheckedChange={() => onToggleChecklist(card.id, item.id)}
                  className="mt-0.5 size-3.5"
                />
                <span
                  className={cn(
                    "leading-snug line-clamp-1",
                    item.concluido && "line-through text-muted-foreground",
                  )}
                >
                  {item.texto}
                </span>
              </label>
            ))}
            {card.checklist.length > 3 && (
              <span className="text-[10px] text-muted-foreground pl-5">
                +{card.checklist.length - 3} item(s)
              </span>
            )}
          </div>
        </div>
      )}

      {card.links.length > 0 && (
        <div
          className="mt-2 flex flex-wrap gap-1"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {card.links.map((link) => (
            <Button
              key={link.id}
              asChild
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] gap-1"
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3" />
                <span className="truncate max-w-[120px]">
                  {link.label || link.url}
                </span>
              </a>
            </Button>
          ))}
        </div>
      )}

      {solucao && (
        <Link
          to={`/solucoes/${solucao.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Badge variant="outline" className="mt-2 gap-1 text-[10px] font-normal">
            <Link2 className="size-3" />
            <span className="truncate max-w-[140px]">{solucao.titulo}</span>
          </Badge>
        </Link>
      )}
      <div className="mt-2.5 flex items-center justify-end">
        {responsavel ? (
          <Avatar className="size-6" title={responsavel.nome}>
            <AvatarFallback className="text-[10px]">
              {initials(responsavel.nome)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="text-[10px] text-muted-foreground">Sem responsável</span>
        )}
      </div>
    </div>
  );
}
