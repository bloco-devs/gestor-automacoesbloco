import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCoverDisplayUrl, listBoardsResumo } from "@/lib/atividadesBoards";

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
}

export function useProjetos(): { projetos: ProjetoNaLista[]; carregando: boolean; erro: Error | null } {
  const q = useQuery({
    queryKey: ["atividades", "boards-resumo"],
    queryFn: listBoardsResumo,
    staleTime: 60_000,
  });

  const ativos = useMemo(() => (q.data ?? []).filter((b) => !b.arquivado), [q.data]);

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
        }))
        // Favoritos primeiro, depois o que se mexeu mais recentemente. Ordem
        // alfabética seria estável e inútil: ninguém procura projeto por letra.
        .sort(
          (a, b) =>
            Number(b.favorito) - Number(a.favorito) ||
            new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
        ),
    [ativos, capasQ.data],
  );

  return {
    projetos,
    carregando: q.isLoading,
    erro: (q.error as Error | null) ?? null,
  };
}
