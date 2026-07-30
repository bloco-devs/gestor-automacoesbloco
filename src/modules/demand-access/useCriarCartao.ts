import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCard } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useAuth } from "@/hooks/useAuth";

/**
 * Criar cartão direto na coluna — sem passar pela IA.
 *
 * A porta de criação existente (`useCriarDemanda`) nasce de uma conversa: ela
 * grava em `demands`, com SLA, tipo e triagem. Isso é certo para quem relata um
 * problema e errado para quem está montando um projeto: dentro de um quadro, a
 * unidade é um item de coluna, e exigir uma conversa de IA para criar "Revisar
 * contrato" é cobrar um pedágio por uma linha de texto.
 *
 * Só existe para escopo de projeto. Na Inbox não há board nem coluna própria —
 * a tela simplesmente não passa o callback e o botão não aparece.
 */
export function useCriarCartao(projetoId: string | null): {
  criar: (params: { colunaId: string; titulo: string }) => Promise<void>;
  salvando: boolean;
} {
  const qc = useQueryClient();
  const { user } = useAuth();

  const mutacao = useMutation({
    mutationFn: async ({ colunaId, titulo }: { colunaId: string; titulo: string }) => {
      if (!projetoId) throw new Error("Sem projeto aberto.");
      await createCard({
        boardId: projetoId,
        colunaId,
        titulo,
        createdBy: user?.id ?? null,
      });
    },
    onSuccess: () => {
      if (!projetoId) return;
      void qc.invalidateQueries({ queryKey: atividadesKeys.cards(projetoId) });
    },
  });

  return {
    criar: async (params) => {
      await mutacao.mutateAsync(params);
    },
    salvando: mutacao.isPending,
  };
}
