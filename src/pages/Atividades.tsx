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
import { Badge } from "@/components/ui/badge";
import { CardDialog } from "@/components/atividades/CardDialog";
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
    setNewCardColuna(colunaId);
    setDialogOpen(true);
  }
  function openEdit(card: AtividadeCard) {
    setEditing(card);
    setNewCardColuna(null);
    setDialogOpen(true);
  }

  async function handleSubmit(data: {
    titulo: string;
    descricao: string;
    responsavelId: string | null;
    solucaoId: string | null;
    checklist: ChecklistItem[];
    links: CardLink[];
  }) {
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
                  responsaveisMap={responsaveisMap}
                  solucoesMap={solucoesMap}
                  onNew={() => openNew(col.id)}
                  onEdit={openEdit}
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
        responsaveis={responsaveis}
        solucoes={solucoes}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
      />
    </div>
  );
}

function Coluna({
  coluna,
  cards,
  responsaveisMap,
  solucoesMap,
  onNew,
  onEdit,
}: {
  coluna: AtividadeColuna;
  cards: AtividadeCard[];
  responsaveisMap: Map<string, AssignableUser>;
  solucoesMap: Map<string, Solucao>;
  onNew: () => void;
  onEdit: (c: AtividadeCard) => void;
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
      </div>
    </div>
  );
}

function KanbanCard({
  card,
  responsavel,
  solucao,
  onEdit,
}: {
  card: AtividadeCard;
  responsavel?: AssignableUser;
  solucao?: Solucao;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

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
