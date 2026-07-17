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
import { ArrowLeft, Star, Archive, Settings, Users, Layers, Clock, Calendar, Lock, Globe, Building2, Image as ImageIcon } from "lucide-react";
import { BG_OPTIONS, splitBoardBackground } from "@/lib/atividadesBg";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BoardSettingsDialog } from "@/components/atividades/quadros/BoardSettingsDialog";
import {
  getBoardResumo,
  toggleFavoritoBoard,
  setBoardArquivado,
  listBoardMembros,
  renomearColuna,
  duplicarColuna,
  arquivarColuna,
  excluirColuna,
  getCoverDisplayUrl,
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
  const canAdmin = resumo?.meuPapel === "owner" || resumo?.meuPapel === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fundo do quadro — GLOBAL, persistido no banco (atividades_boards.background/cover_url).
  // Todos os membros veem o mesmo fundo. Só owner/admin do quadro podem alterar.
  const [boardBg, setBoardBg] = useState<string>("none");
  const [bgImagePath, setBgImagePath] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);

  // Sincroniza estado local com o que veio do servidor sempre que o resumo carrega/muda.
  useEffect(() => {
    if (!resumo) return;
    const { bgKey, imageRef } = splitBoardBackground(resumo.background, resumo.coverUrl);
    setBoardBg(bgKey);
    setBgImagePath(imageRef);
  }, [resumo?.background, resumo?.coverUrl, resumo]);

  // Resolve signed URL sempre que o path muda (com cache em sessionStorage p/ boot instantâneo).
  useEffect(() => {
    let alive = true;
    if (!bgImagePath) { setBgImageUrl(null); return; }
    if (/^https?:\/\//i.test(bgImagePath) || bgImagePath.startsWith("data:")) {
      setBgImageUrl(bgImagePath);
      return;
    }
    const cacheKey = `atividades:boardBgUrl:${bgImagePath}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { url, exp } = JSON.parse(cached) as { url: string; exp: number };
        if (url && exp > Date.now()) {
          setBgImageUrl(url);
          const img = new Image(); img.src = url;
          return;
        }
      }
    } catch { /* noop */ }
    getCoverDisplayUrl(bgImagePath).then((url) => {
      if (!alive) return;
      setBgImageUrl(url);
      if (url) {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ url, exp: Date.now() + 6 * 24 * 3600 * 1000 }));
        } catch { /* noop */ }
        const img = new Image(); img.src = url;
      }
    });
    return () => { alive = false; };
  }, [bgImagePath]);

  async function persistBackground(nextBg: string, nextCover: string | null) {
    if (!boardId) return;
    if (!canAdmin) { toast.error("Só owner/admin do quadro pode alterar o fundo"); return; }
    const prevBg = boardBg;
    const prevCover = bgImagePath;
    setBoardBg(nextBg);
    setBgImagePath(nextCover);
    try {
      const { setBoardBackground } = await import("@/lib/atividadesBoards");
      await setBoardBackground(boardId, nextBg === "none" ? null : nextBg, nextCover);
      qc.invalidateQueries({ queryKey: ["atividades", "board-resumo", boardId] });
      qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] });
    } catch (e) {
      console.error(e);
      setBoardBg(prevBg);
      setBgImagePath(prevCover);
      toast.error("Não foi possível salvar o fundo");
    }
  }

  function pickBg(v: string) {
    void persistBackground(v, bgImagePath);
  }
  async function handleBgImageUpload(file: File) {
    if (!boardId) return;
    if (!canAdmin) { toast.error("Só owner/admin do quadro pode alterar o fundo"); return; }
    const { uploadCoverImage, validateCapa } = await import("@/lib/atividadesBoards");
    const err = validateCapa(file);
    if (err) { toast.error(err); return; }
    setBgUploading(true);
    try {
      const path = await uploadCoverImage(boardId, file);
      await persistBackground(boardBg, path);
      toast.success("Fundo atualizado");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar imagem de fundo");
    } finally {
      setBgUploading(false);
    }
  }
  function setBgImageFromUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) { toast.error("Informe uma URL http(s) válida"); return; }
    void persistBackground(boardBg, trimmed);
  }
  function clearBgImage() {
    void persistBackground(boardBg, null);
  }

  const bgClass = bgImageUrl ? "" : (BG_OPTIONS.find((o) => o.key === boardBg)?.className ?? "");


  const membrosQ = useQueryBoard({
    queryKey: ["atividades", "board-membros-topo", boardId],
    queryFn: () => listBoardMembros(boardId!),
    enabled: !!boardId,
    staleTime: 60_000,
  });
  const membros = membrosQ.data ?? [];

  const coverQ = useQueryBoard({
    queryKey: ["atividades", "board-cover", boardId, resumo?.coverUrl ?? null],
    queryFn: () => getCoverDisplayUrl(resumo?.coverUrl ?? null),
    enabled: !!boardId && !!resumo?.coverUrl,
    staleTime: 5 * 60_000,
  });
  const coverUrl = coverQ.data ?? null;

  function fmtRel(iso?: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "agora";
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `há ${h} h`;
    const days = Math.floor(h / 24);
    if (days < 30) return `há ${days} d`;
    return d.toLocaleDateString();
  }

  const VIS_ICON = { private: Lock, workspace: Building2, public: Globe } as const;
  const VIS_LABEL = { private: "Privado", workspace: "Workspace", public: "Público" } as const;
  const VisIcon = resumo ? VIS_ICON[resumo.visibilidade] : Lock;


  async function handleColRename(col: typeof colunas[number]) {
    const nome = window.prompt("Novo nome da coluna:", col.nome)?.trim();
    if (!nome || nome === col.nome) return;
    try {
      await renomearColuna(col.id, nome);
      qc.invalidateQueries({ queryKey: atividadesKeys.colunas(boardId!) });
      toast.success("Coluna renomeada");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível renomear a coluna");
    }
  }
  async function handleColDuplicate(col: typeof colunas[number]) {
    try {
      await duplicarColuna(col.id);
      qc.invalidateQueries({ queryKey: atividadesKeys.colunas(boardId!) });
      qc.invalidateQueries({ queryKey: atividadesKeys.cards(boardId ?? undefined) });
      toast.success("Coluna duplicada");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível duplicar a coluna");
    }
  }
  async function handleColArchive(col: typeof colunas[number]) {
    if (!window.confirm(`Arquivar a coluna "${col.nome}"?`)) return;
    try {
      await arquivarColuna(col.id, true);
      qc.invalidateQueries({ queryKey: atividadesKeys.colunas(boardId!) });
      toast.success("Coluna arquivada");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível arquivar a coluna");
    }
  }
  async function handleColDelete(col: typeof colunas[number]) {
    const qtd = (cardsByColuna[col.id] ?? []).length;
    if (qtd > 0) {
      toast.error("Só é possível excluir colunas vazias");
      return;
    }
    if (!window.confirm(`Excluir a coluna "${col.nome}"?`)) return;
    try {
      await excluirColuna(col.id);
      qc.invalidateQueries({ queryKey: atividadesKeys.colunas(boardId!) });
      toast.success("Coluna excluída");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível excluir a coluna");
    }
  }


  return (
    <div
      className={cn(
        "space-y-4 -mx-4 -my-4 px-4 py-4 md:-mx-6 md:-my-6 md:px-6 md:py-6 min-h-[calc(100vh-4rem)] rounded-none transition-colors",
        bgClass,
      )}
      style={
        bgImageUrl
          ? {
              backgroundImage: `linear-gradient(hsl(var(--background) / 0.15), hsl(var(--background) / 0.15)), url("${bgImageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >




      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
              <h1 className="text-2xl font-semibold truncate leading-tight">{boardNome}</h1>
              {resumo ? (
                <Badge variant="outline" className="gap-1 font-normal text-[10px] h-5">
                  <VisIcon className="h-3 w-3" />
                  {VIS_LABEL[resumo.visibilidade]}
                </Badge>
              ) : null}
              {resumo?.arquivado ? (
                <Badge variant="secondary" className="gap-1 text-[10px] h-5">
                  <Archive className="h-3 w-3" /> Arquivado
                </Badge>
              ) : null}
            </div>
            {resumo ? (
              <div className="mt-1 flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap">
                <span className="inline-flex items-center gap-1" title="Membros">
                  <Users className="h-3 w-3" />
                  {membros.length}
                </span>
                <span className="inline-flex items-center gap-1" title="Cards ativos">
                  <Layers className="h-3 w-3" />
                  {colunas.reduce((acc, c) => acc + (cardsByColuna[c.id]?.length ?? 0), 0)}
                </span>
                <span className="inline-flex items-center gap-1" title="Última atividade">
                  <Clock className="h-3 w-3" />
                  {fmtRel(resumo.updatedAt)}
                </span>
                {resumo.descricao ? (
                  <>
                    <span aria-hidden className="opacity-40">·</span>
                    <span className="truncate max-w-[48ch]" title={resumo.descricao}>
                      {resumo.descricao}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {membros.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <div className="flex -space-x-2 mr-1">
                {membros.slice(0, 5).map((m) => {
                  const initials = (m.nome || m.email || "?")
                    .split(/\s+/)
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();
                  return (
                    <Tooltip key={m.userId}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="text-xs">
                          {m.nome || m.email} · {m.role}
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {membros.length > 5 && (
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-[10px]">+{membros.length - 5}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </TooltipProvider>
          )}
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
          {canAdmin && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Alterar fundo do quadro">
                <ImageIcon className="h-4 w-4 mr-1.5" />
                Fundo
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3 space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Cores &amp; gradientes</div>
              <div className="grid grid-cols-3 gap-1.5">
                {BG_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => { pickBg(o.key); clearBgImage(); }}
                    title={o.label}
                    className={`group rounded-md border-2 p-1 transition-all ${
                      !bgImageUrl && boardBg === o.key
                        ? "border-foreground ring-2 ring-accent"
                        : "border-transparent hover:border-foreground/40"
                    }`}
                  >
                    <div className={`h-10 w-full rounded ${o.className || "bg-muted"}`} />
                    <div className="mt-1 text-[10px] text-muted-foreground truncate">{o.label}</div>
                  </button>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Imagem de capa</div>
                {bgImageUrl && (
                  <div
                    className="h-20 w-full rounded-md border bg-center bg-cover"
                    style={{ backgroundImage: `url("${bgImageUrl}")` }}
                  />
                )}
                <label className="block">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={bgUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleBgImageUpload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <span
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                      bgUploading && "opacity-50 pointer-events-none",
                    )}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {bgUploading ? "Enviando..." : "Enviar imagem"}
                  </span>
                </label>
                <div className="flex gap-1">
                  <input
                    type="url"
                    placeholder="Colar URL da imagem"
                    className="flex-1 h-8 rounded-md border bg-background px-2 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setBgImageFromUrl((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
                {bgImageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={clearBgImage}
                  >
                    Remover imagem
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Máx. 5 MB. Visível para todos os membros do quadro.
                </p>
              </div>
            </PopoverContent>
          </Popover>
          )}
          {canAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configurações do quadro"
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Configurações
            </Button>
          )}
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
          <div className="relative flex gap-3 overflow-x-auto pb-4">

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
                  canAdmin={canAdmin}
                  onNew={() => openNew(col.id)}
                  onEdit={openEdit}
                  onOpenDraft={openDraft}
                  onDeleteDraft={handleDeleteDraft}
                  onRename={handleColRename}
                  onDuplicate={handleColDuplicate}
                  onArchive={handleColArchive}
                  onDelete={handleColDelete}

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

      <BoardSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        board={resumo ?? null}
        onDeleted={() => navigate("/atividades")}
      />
    </div>
  );
}

