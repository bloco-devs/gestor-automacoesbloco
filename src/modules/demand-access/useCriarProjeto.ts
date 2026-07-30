import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBoard } from "@/lib/atividadesBoards";

/**
 * Criar projeto.
 *
 * A tela pede um nome; o resto (colunas padrão, dono, histórico) é decidido no
 * banco, dentro da mesma transação que cria o quadro. Isso não é preguiça de
 * front: um projeto que nasce sem colunas não é um projeto pela metade, é um
 * projeto quebrado — e a única camada que pode garantir "ou nasce inteiro ou
 * não nasce" é a que tem transação.
 *
 * Como em `useProjetos`, a palavra "quadro" morre aqui: a tela chama de
 * projeto e não sabe em que tabela isso mora hoje.
 */
export function useCriarProjeto(): {
  criar: (nome: string) => Promise<string>;
  salvando: boolean;
} {
  const qc = useQueryClient();

  const mutacao = useMutation({
    mutationFn: (nome: string) => createBoard({ nome, visibilidade: "workspace" }),
    // A lista carrega contagens e ordenação derivadas — invalidar inteiro é
    // mais honesto (e mais barato de manter) que remendar o cache.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] }),
  });

  return {
    criar: (nome: string) => mutacao.mutateAsync(nome),
    salvando: mutacao.isPending,
  };
}
