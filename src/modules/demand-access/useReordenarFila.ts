import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salvarOrdemManual, type FilaOrdenavel } from "@/lib/ordemManual";
import type { PosicaoNaFila } from "@/modules/workspace-demandas/ordenacao";

/**
 * Reordenar uma fila que não é quadro.
 *
 * O quadro já tinha caminho de escrita para posição (`useCardMutations.reorder`
 * → RPC). Aqui é o equivalente para as caixas de entrada: grava `ordem_manual`
 * e invalida a lista, para a próxima leitura vir na sequência nova.
 *
 * O otimismo mora na UI da lista (o dnd-kit já desliza os vizinhos e a lista
 * local reordena na hora); este hook cuida da persistência e do reset em caso
 * de erro, que é reler a verdade do servidor.
 */
export interface ReordenarFila {
  reordenar: (itens: PosicaoNaFila[]) => Promise<void>;
  salvando: boolean;
  erro: Error | null;
}

export function useReordenarFila(tabela: FilaOrdenavel, chaveDaLista: unknown[]): ReordenarFila {
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (itens: PosicaoNaFila[]) => salvarOrdemManual(tabela, itens),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chaveDaLista });
    },
  });

  const reordenar = useCallback(
    async (itens: PosicaoNaFila[]) => {
      await mut.mutateAsync(itens);
    },
    [mut],
  );

  return { reordenar, salvando: mut.isPending, erro: (mut.error as Error) ?? null };
}
