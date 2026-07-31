import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createBoard } from "@/lib/atividadesBoards";

/** A identidade visual escolhida na criação — nada além do que o cabeçalho usa. */
export interface IdentidadeDoProjeto {
  cor?: string | null;
  icone?: string | null;
  /** URL da imagem de fundo do quadro (opcional). */
  background?: string | null;
}


/**
 * Criar projeto.
 *
 * A tela pede um nome; o resto (colunas padrão, dono, histórico) é decidido no
 * banco, dentro da mesma transação que cria o quadro. Isso não é preguiça de
 * front: um projeto que nasce sem colunas não é um projeto pela metade, é um
 * projeto quebrado — e a única camada que pode garantir "ou nasce inteiro ou
 * não nasce" é a que tem transação.
 *
 * Cor e ícone são opcionais e vêm da mesma chamada: o quadradinho cinza do
 * cabeçalho é o único lugar onde um projeto se distingue de outro de longe, e
 * preenchê-lo depois exigia abrir configurações que ninguém abre.
 *
 * Como em `useProjetos`, a palavra "quadro" morre aqui: a tela chama de
 * projeto e não sabe em que tabela isso mora hoje.
 */
export function useCriarProjeto(): {
  criar: (nome: string, identidade?: IdentidadeDoProjeto) => Promise<string>;
  salvando: boolean;
} {
  const qc = useQueryClient();

  const mutacao = useMutation({
    mutationFn: ({ nome, identidade }: { nome: string; identidade?: IdentidadeDoProjeto }) =>
      createBoard({
        nome,
        visibilidade: "workspace",
        cor: identidade?.cor ?? null,
        icone: identidade?.icone ?? null,
      }),
    // A lista carrega contagens e ordenação derivadas — invalidar inteiro é
    // mais honesto (e mais barato de manter) que remendar o cache.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] }),
  });

  return {
    criar: (nome: string, identidade?: IdentidadeDoProjeto) =>
      mutacao.mutateAsync({ nome, identidade }),
    salvando: mutacao.isPending,
  };
}
