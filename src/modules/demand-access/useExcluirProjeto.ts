import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBoard } from "@/lib/atividadesBoards";

/**
 * Excluir projeto — definitivo, e por isso separado de arquivar.
 *
 * `useProjetos` já oferece arquivar/restaurar, que é o caminho normal: some da
 * lista sem destruir histórico. Excluir existe para o outro caso — o quadro
 * criado por engano, o teste, o duplicado — e a tela precisa cobrar uma
 * confirmação explícita antes de chamar isto, porque os cartões vão com ele.
 */
export function useExcluirProjeto(): {
  excluir: (id: string) => Promise<void>;
  salvando: boolean;
} {
  const qc = useQueryClient();

  const mutacao = useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] }),
  });

  return {
    excluir: async (id: string) => {
      await mutacao.mutateAsync(id);
    },
    salvando: mutacao.isPending,
  };
}
