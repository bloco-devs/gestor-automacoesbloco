import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCard } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";

/**
 * Excluir cartão — definitivo.
 *
 * Só faz sentido em escopo de quadro (`atividades_cards`): é lá que o cartão é
 * um item de coluna, e não um ticket com fio de conversa e SLA. A tela cobra a
 * confirmação antes de chamar isto.
 */
export function useExcluirCartao(projetoId: string | null): {
  excluir: (id: string) => Promise<void>;
  salvando: boolean;
} {
  const qc = useQueryClient();

  const mutacao = useMutation({
    mutationFn: (id: string) => deleteCard(id),
    onSuccess: () => {
      if (!projetoId) return;
      void qc.invalidateQueries({ queryKey: atividadesKeys.cards(projetoId) });
    },
  });

  return {
    excluir: async (id: string) => {
      await mutacao.mutateAsync(id);
    },
    salvando: mutacao.isPending,
  };
}
