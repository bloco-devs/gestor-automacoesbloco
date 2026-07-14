import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listBoards,
  listCards,
  listColunas,
  listLabels,
  listPersonas,
  getCardById,
  type AtividadeBoard,
  type AtividadeCard,
  type AtividadeColuna,
  type AtividadeLabel,
  type AtividadePersona,
} from "@/lib/atividades";
import { listAssignableUsers, listSolucoes } from "@/lib/supabaseData";
import type { AssignableUser, Solucao } from "@/lib/types";

// ----- Query keys (centralizadas) -----
export const atividadesKeys = {
  all: ["atividades"] as const,
  boards: () => [...atividadesKeys.all, "boards"] as const,
  colunas: (boardId: string) => [...atividadesKeys.all, "colunas", boardId] as const,
  cards: (boardId: string) => [...atividadesKeys.all, "cards", boardId] as const,
  labels: (boardId: string) => [...atividadesKeys.all, "labels", boardId] as const,
  personas: () => [...atividadesKeys.all, "personas"] as const,
  responsaveis: () => [...atividadesKeys.all, "responsaveis"] as const,
  solucoes: () => [...atividadesKeys.all, "solucoes"] as const,
  comentarios: (cardId: string) => [...atividadesKeys.all, "comentarios", cardId] as const,
  activity: (cardId: string) => [...atividadesKeys.all, "activity", cardId] as const,
  anexos: (cardId: string) => [...atividadesKeys.all, "anexos", cardId] as const,
  anexosCounts: (boardId?: string) =>
    [...atividadesKeys.all, "anexosCounts", boardId ?? "_"] as const,
};

const STALE = 30_000;

/**
 * Board padrão + queries de suporte.
 * Realtime centralizado: refetch por cartão quando possível,
 * fallback para invalidação da lista completa.
 */
export function useAtividadesBoard() {
  const qc = useQueryClient();

  const boardsQ = useQuery({
    queryKey: atividadesKeys.boards(),
    queryFn: listBoards,
    staleTime: 5 * 60_000,
  });

  const boardId = useMemo<string | null>(() => {
    const list = boardsQ.data ?? [];
    return list.find((b) => b.slug === "default")?.id ?? list[0]?.id ?? null;
  }, [boardsQ.data]);

  const colunasQ = useQuery<AtividadeColuna[]>({
    queryKey: boardId ? atividadesKeys.colunas(boardId) : ["atividades", "colunas", "_"],
    queryFn: () => listColunas(boardId!),
    enabled: !!boardId,
    staleTime: STALE,
  });

  const cardsQ = useQuery<AtividadeCard[]>({
    queryKey: boardId ? atividadesKeys.cards(boardId) : ["atividades", "cards", "_"],
    queryFn: () => listCards(boardId!),
    enabled: !!boardId,
    staleTime: STALE,
  });

  const labelsQ = useQuery<AtividadeLabel[]>({
    queryKey: boardId ? atividadesKeys.labels(boardId) : ["atividades", "labels", "_"],
    queryFn: () => listLabels(boardId!),
    enabled: !!boardId,
    staleTime: STALE,
  });

  const personasQ = useQuery<AtividadePersona[]>({
    queryKey: atividadesKeys.personas(),
    queryFn: listPersonas,
    staleTime: 5 * 60_000,
  });

  const responsaveisQ = useQuery<AssignableUser[]>({
    queryKey: atividadesKeys.responsaveis(),
    queryFn: listAssignableUsers,
    staleTime: 5 * 60_000,
  });

  const solucoesQ = useQuery<Solucao[]>({
    queryKey: atividadesKeys.solucoes(),
    queryFn: listSolucoes,
    staleTime: 60_000,
  });

  // ----- Atualização localizada por cartão -----
  const refetchCard = useCallback(
    async (cardId: string) => {
      if (!boardId) return;
      try {
        const next = await getCardById(cardId);
        qc.setQueryData<AtividadeCard[] | undefined>(
          atividadesKeys.cards(boardId),
          (prev) => {
            if (!prev) return prev;
            if (!next) return prev.filter((c) => c.id !== cardId);
            const idx = prev.findIndex((c) => c.id === cardId);
            if (idx === -1) return [...prev, next];
            const copy = prev.slice();
            copy[idx] = next;
            return copy;
          },
        );
      } catch (e) {
        console.error("[atividades] refetchCard falhou, invalidando:", e);
        qc.invalidateQueries({ queryKey: atividadesKeys.cards(boardId) });
      }
    },
    [boardId, qc],
  );

  const removeCardFromCache = useCallback(
    (cardId: string) => {
      if (!boardId) return;
      qc.setQueryData<AtividadeCard[] | undefined>(
        atividadesKeys.cards(boardId),
        (prev) => prev?.filter((c) => c.id !== cardId),
      );
    },
    [boardId, qc],
  );

  const invalidateAll = useCallback(() => {
    if (!boardId) return;
    qc.invalidateQueries({ queryKey: atividadesKeys.cards(boardId) });
    qc.invalidateQueries({ queryKey: atividadesKeys.labels(boardId) });
  }, [boardId, qc]);

  // ----- Realtime (multi-tabela, dedup por evento) -----
  useEffect(() => {
    if (!boardId) return;
    const channel = supabase
      .channel(`atividades-rt-${boardId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "atividades_cards" },
        (payload) => {
          const row = payload.new as { id?: string; board_id?: string } | null;
          if (!row?.id || row.board_id !== boardId) return;
          refetchCard(row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "atividades_cards" },
        (payload) => {
          const row = payload.new as { id?: string; board_id?: string } | null;
          if (!row?.id || row.board_id !== boardId) return;
          refetchCard(row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "atividades_cards" },
        (payload) => {
          const row = payload.old as { id?: string } | null;
          if (!row?.id) return;
          removeCardFromCache(row.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades_card_labels" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { card_id?: string } | null;
          if (row?.card_id) refetchCard(row.card_id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades_labels" },
        () => qc.invalidateQueries({ queryKey: atividadesKeys.labels(boardId) }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades_comentarios" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { card_id?: string } | null;
          if (row?.card_id)
            qc.invalidateQueries({ queryKey: atividadesKeys.comentarios(row.card_id) });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "atividades_atividade_log" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { card_id?: string } | null;
          if (row?.card_id)
            qc.invalidateQueries({ queryKey: atividadesKeys.activity(row.card_id) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, qc, refetchCard, removeCardFromCache]);

  return {
    board: boardsQ.data?.find((b) => b.id === boardId) as AtividadeBoard | undefined,
    boardId,
    colunas: colunasQ.data ?? [],
    cards: cardsQ.data ?? [],
    labels: labelsQ.data ?? [],
    personas: personasQ.data ?? [],
    responsaveis: responsaveisQ.data ?? [],
    solucoes: solucoesQ.data ?? [],
    loading:
      boardsQ.isLoading ||
      colunasQ.isLoading ||
      cardsQ.isLoading ||
      labelsQ.isLoading ||
      responsaveisQ.isLoading ||
      solucoesQ.isLoading ||
      personasQ.isLoading,
    refetchCard,
    invalidateAll,
  };
}
