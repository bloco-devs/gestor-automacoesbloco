import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCoverDisplayUrl, listBoardsResumo, setBoardArquivado } from "@/lib/atividadesBoards";

/**
 * A lista de projetos.
 *
 * POR QUE ELA MORA AQUI, E NÃO NA TELA
 * Projeto é um conceito de produto: um recorte de trabalho com nome, dono e
 * prazo. Quadro é um detalhe de onde os dados moram hoje — herança da
 * importação do Trello. A tela precisa da primeira ideia e não pode conhecer a
 * segunda; então a tradução acontece aqui, exatamente como acontece com as
 * demandas em `useDemandas`.
 *
 * Quando `demands` ganhar projeto de verdade, muda esta função e mais nada:
 * nenhuma tela sabe que hoje um projeto é um quadro.
 */
export interface ProjetoNaLista {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  /** URL exibível. `BoardResumo.coverUrl` é caminho de storage, não URL. */
  capaUrl: string | null;
  abertas: number;
  total: number;
  pessoas: number;
  favorito: boolean;
  atualizadoEm: string;
  arquivado: boolean;
}

/**
 * ARQUIVAR EM VEZ DE APAGAR
 *
 * Um projeto que parou de servir não é um projeto errado: é um projeto que
 * cumpriu (ou abandonou) o seu papel, e cujo histórico continua sendo a
 * resposta para "por que decidimos aquilo em março". Apagar resolve a
 * poluição da lista e destrói a memória junto — e a memória é a parte que não
 * dá para refazer.
 *
 * A coluna `arquivado` já existia no banco desde a importação do Trello, e
 * `useProjetos` já filtrava por ela. O que faltava era alguém poder acionar
 * isso de onde trabalha: a única tela com esse botão era o diálogo de
 * configurações do quadro, dentro da experiência antiga de Atividades.
 */
export function useProjetos(
  opcoes: { incluirArquivados?: boolean } = {},
): {
  projetos: ProjetoNaLista[];
  carregando: boolean;
  erro: Error | null;
  arquivar: (id: string) => Promise<void>;
  restaurar: (id: string) => Promise<void>;
  salvando: boolean;
} {
  const { incluirArquivados = false } = opcoes;
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["atividades", "boards-resumo"],
    queryFn: listBoardsResumo,
    staleTime: 60_000,
  });

  const ativos = useMemo(
    () => (q.data ?? []).filter((b) => incluirArquivados || !b.arquivado),
    [q.data, incluirArquivados],
  );

  /**
   * As capas vêm como caminho de storage e precisam virar URL assinada. É uma
   * chamada por projeto, então fica numa query separada: a lista aparece
   * imediatamente com a cor de fundo e a capa entra depois, em vez de a tela
   * inteira esperar pelas imagens.
   */
  const capasQ = useQuery({
    queryKey: ["atividades", "capas", ativos.map((b) => b.id).join(",")],
    enabled: ativos.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const pares = await Promise.all(
        ativos.map(async (b) => [b.id, await getCoverDisplayUrl(b.coverUrl)] as const),
      );
      return Object.fromEntries(pares) as Record<string, string | null>;
    },
  });

  const projetos = useMemo(
    () =>
      ativos
        .map((b) => ({
          id: b.id,
          nome: b.nome,
          descricao: b.descricao,
          cor: b.cor,
          capaUrl: capasQ.data?.[b.id] ?? null,
          abertas: b.cardsAbertos,
          total: b.totalCards,
          pessoas: b.totalMembros,
          favorito: b.favorito,
          atualizadoEm: b.updatedAt,
          arquivado: b.arquivado,
        }))
        // Favoritos primeiro, depois o que se mexeu mais recentemente. Ordem
        // alfabética seria estável e inútil: ninguém procura projeto por letra.
        // Arquivado desce para o fim mesmo quando visível: ele está ali para
        // ser encontrado e restaurado, não para disputar atenção com o que
        // ainda tem trabalho vivo.
        .sort(
          (a, b) =>
            Number(a.arquivado) - Number(b.arquivado) ||
            Number(b.favorito) - Number(a.favorito) ||
            new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
        ),
    [ativos, capasQ.data],
  );

  const mutacao = useMutation({
    mutationFn: ({ id, arquivado }: { id: string; arquivado: boolean }) =>
      setBoardArquivado(id, arquivado),
    // Invalida a lista inteira em vez de remendar o cache: a contagem de
    // abertas e a ordenação mudam junto, e um cache remendado pela metade é
    // pior que uma ida a mais ao servidor.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atividades", "boards-resumo"] }),
  });

  return {
    projetos,
    carregando: q.isLoading,
    erro: (q.error as Error | null) ?? null,
    arquivar: async (id: string) => {
      await mutacao.mutateAsync({ id, arquivado: true });
    },
    restaurar: async (id: string) => {
      await mutacao.mutateAsync({ id, arquivado: false });
    },
    salvando: mutacao.isPending,
  };
}
