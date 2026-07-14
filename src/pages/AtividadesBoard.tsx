import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { countAnexosByBoard, purgeAnexosDoCard } from "@/lib/atividadesAnexos";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Skeleton as SkeletonAt } from "@/components/ui/skeleton";
import {
  prazoStatus,
  type AtividadeCard,
  type AtividadeLabel,
  type PrazoStatus,
} from "@/lib/atividades";
import { CardDialog, type CardDraftValues } from "@/components/atividades/CardDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAtividadesBoard, atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useCardMutations } from "@/hooks/useCardMutations";
import { Coluna } from "@/components/atividades/kanban/Coluna";
import { KanbanCard } from "@/components/atividades/kanban/KanbanCard";
import { BoardFilters } from "@/components/atividades/kanban/BoardFilters";
import {
  buildResponsaveisDisplay,
  type ResponsavelDisplay,
} from "@/components/atividades/kanban/helpers";
import type { Draft } from "@/components/atividades/kanban/DraftCard";

import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery as useQueryBoard } from "@tanstack/react-query";
import { ArrowLeft, Star, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBoardResumo,
  toggleFavoritoBoard,
  setBoardArquivado,
} from "@/lib/atividadesBoards";

export default function AtividadesBoard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ boardId: string }>();
  const routeBoardId = params.boardId ?? null;

  const {
    boardId,
    colunas,
    cards,
    labels,
    personas,
    responsaveis,
    solucoes,
    loading,
  } = useAtividadesBoard(routeBoardId);
  const { create, update, remove, reorder } = useCardMutations(boardId);

  const resumoQ = useQueryBoard({
    queryKey: ["atividades", "board-resumo", boardId],
    queryFn: () => getBoardResumo(boardId!),
    enabled: !!boardId,
    staleTime: 30_000,
  });
  const resumo = resumoQ.data;


  // Contagem de anexos por card no board (para badge do KanbanCard)
  const anexosCountsQ = useQuery<Map<string, number>>({
    queryKey: atividadesKeys.anexosCounts(boardId ?? undefined),
    queryFn: () => countAnexosByBoard(boardId!),
    enabled: !!boardId,
    staleTime: 30_000,
  });
  const anexosCounts = anexosCountsQ.data;

  // Dialog / drafts
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AtividadeCard | null>(null);
  const [newCardColuna, setNewCardColuna] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const editingDraft = drafts.find((d) => d.id === editingDraftId) ?? null;

  // Filtros
  const [filterUserIds, setFilterUserIds] = useState<string[]>([]);
  const [filterSolucaoIds, setFilterSolucaoIds] = useState<string[]>([]);
  const [filterLabelIds, setFilterLabelIds] = useState<string[]>([]);
  const [filterPrazo, setFilterPrazo] = useState<PrazoStatus | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [buscaDeb, setBuscaDeb] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setBuscaDeb(busca.trim().toLowerCase()), 150);
    return () => clearTimeout(t);
  }, [busca]);

  const hasFilters =
    filterUserIds.length > 0 ||
    filterSolucaoIds.length > 0 ||
    filterLabelIds.length > 0 ||
    filterPrazo !== "todos" ||
    buscaDeb.length > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const labelsMap = useMemo(() => new Map(labels.map((l) => [l.id, l])), [labels]);
  const responsaveisMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u])),
    [responsaveis],
  );
  const solucoesMap = useMemo(() => new Map(solucoes.map((s) => [s.id, s])), [solucoes]);
  const personasMap = useMemo(() => new Map(personas.map((p) => [p.id, p])), [personas]);
  const personasByUser = useMemo(() => {
    const m = new Map<string, typeof personas>();
    for (const p of personas) {
      const arr = m.get(p.userId) ?? [];
      arr.push(p);
      m.set(p.userId, arr);
    }
    return m;
  }, [personas]);

  const cardsByColuna = useMemo(() => {
    const map: Record<string, AtividadeCard[]> = {};
    for (const c of colunas) map[c.id] = [];
    for (const card of cards) {
      if (!map[card.colunaId]) continue;
      if (filterUserIds.length > 0) {
        const ids = card.responsavelIds.length
          ? card.responsavelIds
          : card.responsavelId
            ? [card.responsavelId]
            : [];
        if (!ids.some((id) => filterUserIds.includes(id))) continue;
      }
      if (filterSolucaoIds.length > 0) {
        if (!card.solucaoId || !filterSolucaoIds.includes(card.solucaoId)) continue;
      }
      if (filterLabelIds.length > 0) {
        if (!card.labelIds.some((id) => filterLabelIds.includes(id))) continue;
      }
      if (filterPrazo !== "todos") {
        if (prazoStatus(card) !== filterPrazo) continue;
      }
      if (buscaDeb) {
        const hay = `${card.titulo} ${card.descricao}`.toLowerCase();
        if (!hay.includes(buscaDeb)) continue;
      }
      map[card.colunaId].push(card);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.ordem - b.ordem || a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [
    cards,
    colunas,
    filterUserIds,
    filterSolucaoIds,
    filterLabelIds,
    filterPrazo,
    buscaDeb,
  ]);

  const totalCardsFiltrados = useMemo(
    () => Object.values(cardsByColuna).reduce((n, arr) => n + arr.length, 0),
    [cardsByColuna],
  );

  // ---------- DnD ----------
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function findColuna(id: string): string | null {
    const c = cards.find((x) => x.id === id);
    if (c) return c.colunaId;
    if (colunas.some((col) => col.id === id)) return id;
    return null;
  }
  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function handleDragOver(e: DragOverEvent) {
    const active = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || !boardId) return;
    const activeColuna = findColuna(active);
    const overColuna = findColuna(overId);
    if (!activeColuna || !overColuna || activeColuna === overColuna) return;
    // Otimista: patch direto na cache
    qc.setQueryData<AtividadeCard[] | undefined>(
      atividadesKeys.cards(boardId),
      (prev) => {
        if (!prev) return prev;
        const activeCard = prev.find((c) => c.id === active);
        if (!activeCard) return prev;
        const without = prev.filter((c) => c.id !== active);
        const overIsCard = prev.some((c) => c.id === overId);
        const moved: AtividadeCard = { ...activeCard, colunaId: overColuna };
        if (overIsCard) {
          const idx = without.findIndex((c) => c.id === overId);
          return [...without.slice(0, idx), moved, ...without.slice(idx)];
        }
        return [...without, moved];
      },
    );
  }
  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const active = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;
    const overColuna = findColuna(overId);
    if (!overColuna) return;

    const colCards = cards
      .filter((c) => c.colunaId === overColuna)
      .sort((a, b) => a.ordem - b.ordem);
    const oldIdx = colCards.findIndex((c) => c.id === active);
    let newIdx = oldIdx;
    if (overId !== overColuna) {
      newIdx = colCards.findIndex((c) => c.id === overId);
      if (newIdx === -1) newIdx = colCards.length - 1;
    } else {
      newIdx = colCards.length - 1;
    }
    const reordered = oldIdx === -1 ? colCards : arrayMove(colCards, oldIdx, newIdx);
    const updates = reordered.map((c, i) => ({
      id: c.id,
      colunaId: overColuna,
      ordem: i,
    }));
    try {
      await reorder.mutateAsync(updates);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível reordenar os cards");
    }
  }

  // ---------- Ações do dialog ----------
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
      setDrafts((ds) => ds.map((d) => (d.id === editingDraftId ? { ...d, data } : d)));
    } else {
      const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setDrafts((ds) => [...ds, { id, colunaId: newCardColuna, data }]);
    }
    toast.success("Rascunho salvo na coluna");
  }
  function handleDiscardDraft() {
    if (editingDraftId) setDrafts((ds) => ds.filter((d) => d.id !== editingDraftId));
  }
  function handleDeleteDraft(draftId: string) {
    setDrafts((ds) => ds.filter((d) => d.id !== draftId));
  }

  async function handleSubmit(data: CardDraftValues) {
    if (!boardId) return;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: data });
        toast.success("Card atualizado");
      } else if (newCardColuna) {
        await create.mutateAsync({
          boardId,
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
          dataEntrega: data.dataEntrega,
          prioridade: data.prioridade,
          coverCor: data.coverCor,
          labelIds: data.labelIds,
        });
        if (editingDraftId) setDrafts((ds) => ds.filter((d) => d.id !== editingDraftId));
        toast.success("Card criado");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar card");
      throw e;
    }
  }

  async function handleDelete() {
    if (!editing) return;
    try {
      // Purga os objetos do Storage antes do CASCADE apagar as linhas.
      await purgeAnexosDoCard(editing.id);
      await remove.mutateAsync(editing.id);
      qc.invalidateQueries({ queryKey: atividadesKeys.anexosCounts(boardId ?? undefined) });
      toast.success("Card excluído");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir");
    }
  }

  function handleLabelCreated(l: AtividadeLabel) {
    if (!boardId) return;
    qc.setQueryData<AtividadeLabel[] | undefined>(atividadesKeys.labels(boardId), (prev) =>
      prev ? [...prev, l] : [l],
    );
  }

  // ---------- Overlay ----------
  const overlayResponsaveis: ResponsavelDisplay[] = activeCard
    ? buildResponsaveisDisplay(activeCard, responsaveisMap, personasMap, personasByUser)
    : [];

  const toggleFav = async () => {
    if (!boardId) return;
    try {
      const now = await toggleFavoritoBoard(boardId);
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", boardId] });
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
      toast.success(now ? "Adicionado aos favoritos" : "Removido dos favoritos");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar favorito");
    }
  };
  const toggleArquivar = async () => {
    if (!boardId || !resumo) return;
    try {
      await setBoardArquivado(boardId, !resumo.arquivado);
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", boardId] });
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
      toast.success(resumo.arquivado ? "Quadro restaurado" : "Quadro arquivado");
      if (!resumo.arquivado) navigate("/atividades");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar o quadro");
    }
  };

  const boardNome = resumo?.nome ?? "Quadro";

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/atividades" className="hover:text-foreground transition-colors">
          Atividades
        </Link>
        <span aria-hidden>›</span>
        <Link to="/atividades" className="hover:text-foreground transition-colors">
          Quadros
        </Link>
        <span aria-hidden>›</span>
        <span className="text-foreground font-medium truncate max-w-[40ch]">
          {boardNome}
        </span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/atividades")}
            aria-label="Voltar para lista de quadros"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {resumo?.cor ? (
            <div
              className="h-8 w-8 rounded-lg shrink-0"
              style={{ backgroundColor: resumo.cor }}
              aria-hidden
            />
          ) : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold truncate">{boardNome}</h1>
              {resumo?.arquivado ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Arquivado
                </span>
              ) : null}
            </div>
            {resumo?.descricao ? (
              <p className="text-sm text-muted-foreground truncate">{resumo.descricao}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Arraste os cards entre as colunas.
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFav}
            aria-label={resumo?.favorito ? "Desfavoritar" : "Favoritar"}
          >
            <Star
              className={`h-4 w-4 ${resumo?.favorito ? "fill-amber-400 text-amber-400" : ""}`}
            />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleArquivar}>
            <Archive className="h-4 w-4 mr-1.5" />
            {resumo?.arquivado ? "Restaurar" : "Arquivar"}
          </Button>
        </div>
      </div>


      <BoardFilters
        busca={busca}
        setBusca={setBusca}
        responsaveis={responsaveis}
        solucoes={solucoes.map((s) => ({ id: s.id, titulo: s.titulo }))}
        labels={labels}
        filterUserIds={filterUserIds}
        setFilterUserIds={setFilterUserIds}
        filterSolucaoIds={filterSolucaoIds}
        setFilterSolucaoIds={setFilterSolucaoIds}
        filterLabelIds={filterLabelIds}
        setFilterLabelIds={setFilterLabelIds}
        filterPrazo={filterPrazo}
        setFilterPrazo={setFilterPrazo}
        onClearAll={() => {
          setFilterUserIds([]);
          setFilterSolucaoIds([]);
          setFilterLabelIds([]);
          setFilterPrazo("todos");
          setBusca("");
        }}
        hasFilters={hasFilters}
        totalCards={cards.length}
        totalCardsFiltrados={totalCardsFiltrados}
      />

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[272px] space-y-2 rounded-xl border bg-card p-3"
            >
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
          <div className="flex gap-3 overflow-x-auto pb-4">
            {colunas.map((col) => (
              <div key={col.id} className="shrink-0 w-[272px]">
                <Coluna
                  coluna={col}
                  cards={cardsByColuna[col.id] ?? []}
                  drafts={drafts.filter((d) => d.colunaId === col.id)}
                  responsaveisMap={responsaveisMap}
                  personasMap={personasMap}
                  personasByUser={personasByUser}
                  solucoesMap={solucoesMap}
                  labelsMap={labelsMap}
                  anexosCounts={anexosCounts}
                  currentUserId={user?.id ?? null}
                  onNew={() => openNew(col.id)}
                  onEdit={openEdit}
                  onOpenDraft={openDraft}
                  onDeleteDraft={handleDeleteDraft}
                />
              </div>
            ))}
          </div>
          <DragOverlay>
            {activeCard ? (
              <KanbanCard
                card={activeCard}
                responsaveis={overlayResponsaveis}
                solucao={
                  activeCard.solucaoId ? solucoesMap.get(activeCard.solucaoId) : undefined
                }
                labelsMap={labelsMap}
                isMine={!!user?.id && activeCard.responsavelIds.includes(user.id)}
                onEdit={() => {}}
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
        boardId={boardId}
        responsaveis={responsaveis}
        personas={personas}
        solucoes={solucoes}
        labels={labels}
        onLabelCreated={handleLabelCreated}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        onSaveDraft={!editing ? handleSaveDraft : undefined}
        onDiscardDraft={!editing ? handleDiscardDraft : undefined}
      />
    </div>
  );
}
