import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCard,
  deleteCard,
  reorderCardsBulk,
  updateCard,
  type AtividadeCard,
  type CreateCardInput,
  type UpdateCardPatch,
} from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";

interface ReorderItem {
  id: string;
  colunaId: string;
  ordem: number;
}

export function useCardMutations(boardId: string | null) {
  const qc = useQueryClient();
  const cardsKey = boardId ? atividadesKeys.cards(boardId) : ["atividades", "cards", "_"];

  const create = useMutation({
    mutationFn: (input: CreateCardInput) => createCard(input),
    onSuccess: (created) => {
      qc.setQueryData<AtividadeCard[] | undefined>(cardsKey, (prev) =>
        prev ? [...prev, created] : [created],
      );
    },
  });

  const update = useMutation({
    mutationFn: (v: { id: string; patch: UpdateCardPatch }) => updateCard(v.id, v.patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: cardsKey });
      const prev = qc.getQueryData<AtividadeCard[] | undefined>(cardsKey);
      qc.setQueryData<AtividadeCard[] | undefined>(cardsKey, (curr) =>
        curr?.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(patch.titulo !== undefined ? { titulo: patch.titulo } : {}),
                ...(patch.descricao !== undefined ? { descricao: patch.descricao } : {}),
                ...(patch.responsavelIds !== undefined
                  ? {
                      responsavelIds: patch.responsavelIds,
                      responsavelId: patch.responsavelIds[0] ?? null,
                    }
                  : {}),
                ...(patch.responsavelPersonaIds !== undefined
                  ? { responsavelPersonaIds: patch.responsavelPersonaIds }
                  : {}),
                ...(patch.solucaoId !== undefined ? { solucaoId: patch.solucaoId } : {}),
                ...(patch.colunaId !== undefined ? { colunaId: patch.colunaId } : {}),
                ...(patch.ordem !== undefined ? { ordem: patch.ordem } : {}),
                ...(patch.checklist !== undefined ? { checklist: patch.checklist } : {}),
                ...(patch.links !== undefined ? { links: patch.links } : {}),
                ...(patch.dataEntrega !== undefined ? { dataEntrega: patch.dataEntrega } : {}),
                ...(patch.prioridade !== undefined ? { prioridade: patch.prioridade } : {}),
                ...(patch.coverCor !== undefined ? { coverCor: patch.coverCor } : {}),
                ...(patch.concluido !== undefined ? { concluido: patch.concluido } : {}),
                ...(patch.labelIds !== undefined ? { labelIds: patch.labelIds } : {}),
              }
            : c,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(cardsKey, ctx.prev);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: cardsKey });
      const prev = qc.getQueryData<AtividadeCard[] | undefined>(cardsKey);
      qc.setQueryData<AtividadeCard[] | undefined>(cardsKey, (curr) =>
        curr?.filter((c) => c.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(cardsKey, ctx.prev);
    },
  });

  const reorder = useMutation({
    mutationFn: (items: ReorderItem[]) => reorderCardsBulk(items),
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: cardsKey });
      const prev = qc.getQueryData<AtividadeCard[] | undefined>(cardsKey);
      qc.setQueryData<AtividadeCard[] | undefined>(cardsKey, (curr) =>
        curr?.map((c) => {
          const u = items.find((x) => x.id === c.id);
          return u ? { ...c, colunaId: u.colunaId, ordem: u.ordem } : c;
        }),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(cardsKey, ctx.prev);
    },
  });

  return { create, update, remove, reorder };
}
