import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtividadesBoard, atividadesKeys } from "@/hooks/useAtividadesBoard";
import { countAnexosByBoard } from "@/lib/atividadesAnexos";
import { useDemands, useDemandProfiles } from "@/modules/demands";
import { listSolucoes } from "@/lib/supabaseData";
import {
  fromAtividades,
  fromDemands,
  CAPACIDADES_ATIVIDADES,
  CAPACIDADES_DEMANDS,
  type Pessoa,
  type Sistema,
} from "@/domain/demand";
import { projetoDoEscopo, resolverFonte } from "./resolverFonte";
import type { EstadoDemandas, Escopo } from "./types";

/**
 * A porta de leitura. É o único hook que a UI de demandas precisa conhecer.
 *
 * Ele chama os hooks que já existem (`useAtividadesBoard`, `useDemands`),
 * passa o resultado pelos mappers do domínio e devolve `Demanda[]`. Nenhuma
 * consulta nova foi escrita: `listSolucoes` e `countAnexosByBoard` são
 * serviços já usados pelas páginas atuais.
 *
 * CUSTO CONHECIDO E ACEITO
 * As regras do React proíbem chamar hook condicionalmente, então os dois
 * hooks de fonte são sempre invocados. `useAtividadesBoard(null)` desliga
 * sozinho (suas queries têm `enabled: !!boardId`), mas `useDemands()` não
 * aceita `enabled` — então, num escopo de projeto, ele ainda faz uma consulta
 * e abre um canal de realtime que não será usado.
 *
 * A correção é de uma linha em `useDemands` (aceitar `enabled`), mas isso é
 * alterar um hook existente, o que está fora do escopo combinado. Fica
 * registrado no relatório como o primeiro ajuste a aprovar.
 */
export function useDemandas(escopo: Escopo): EstadoDemandas {
  const fonte = resolverFonte(escopo);
  const projetoId = projetoDoEscopo(escopo);

  // ---- fonte: atividades_cards -------------------------------------------
  const board = useAtividadesBoard(fonte === "atividades" ? projetoId : null);

  const anexosQ = useQuery<Map<string, number>>({
    queryKey: atividadesKeys.anexosCounts(board.boardId ?? undefined),
    queryFn: () => countAnexosByBoard(board.boardId!),
    enabled: fonte === "atividades" && !!board.boardId,
    staleTime: 60_000,
  });

  // ---- fonte: demands -----------------------------------------------------
  const demandsQ = useDemands();
  const demandsList = useMemo(() => demandsQ.data ?? [], [demandsQ.data]);
  const perfisQ = useDemandProfiles(fonte === "demands" ? demandsList : undefined);

  // Catálogo de soluções: vira `sistema` no domínio. Serve às duas fontes.
  const solucoesQ = useQuery({
    queryKey: ["solucoes"],
    queryFn: listSolucoes,
    staleTime: 5 * 60_000,
  });

  return useMemo<EstadoDemandas>(() => {
    if (fonte === "atividades") {
      const { demandas } = fromAtividades({
        cards: board.cards,
        colunas: board.colunas,
        labels: board.labels,
        personas: board.personas,
        responsaveis: board.responsaveis,
        solucoes: board.solucoes,
        anexosPorCard: anexosQ.data,
      });
      return {
        demandas,
        capacidades: CAPACIDADES_ATIVIDADES,
        fonte,
        carregando: board.loading,
        erro: null,
      };
    }

    const pessoasPorId = new Map<string, Pessoa>();
    for (const [id, perfil] of Object.entries(perfisQ.data ?? {})) {
      const p = perfil as { nome?: string; avatarUrl?: string | null } | undefined;
      pessoasPorId.set(id, { id, nome: p?.nome ?? "—", avatarUrl: p?.avatarUrl ?? null });
    }

    const sistemasPorId = new Map<string, Sistema>();
    for (const s of solucoesQ.data ?? []) sistemasPorId.set(s.id, { id: s.id, nome: s.titulo });

    const { demandas } = fromDemands({ demands: demandsList, pessoasPorId, sistemasPorId });

    return {
      demandas,
      capacidades: CAPACIDADES_DEMANDS,
      fonte,
      carregando: demandsQ.isLoading,
      erro: (demandsQ.error as Error) ?? null,
    };
  }, [
    fonte,
    board.cards,
    board.colunas,
    board.labels,
    board.personas,
    board.responsaveis,
    board.solucoes,
    board.loading,
    anexosQ.data,
    demandsList,
    demandsQ.isLoading,
    demandsQ.error,
    perfisQ.data,
    solucoesQ.data,
  ]);
}

/** Uma demanda só, pelo id. Usado pela rota `/demandas/:id`. */
export function useDemanda(escopo: Escopo, demandaId: string | null) {
  const estado = useDemandas(escopo);
  const demanda = useMemo(
    () => (demandaId ? (estado.demandas.find((d) => d.id === demandaId) ?? null) : null),
    [estado.demandas, demandaId],
  );
  return { ...estado, demanda };
}
