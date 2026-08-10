import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCards, listColunas, listLabels, listPersonas } from "@/lib/atividades";
import { listBoardsResumo } from "@/lib/atividadesBoards";
import { listAssignableUsers, listSolucoes } from "@/lib/supabaseData";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useDemands, useDemandProfiles } from "@/modules/demands";
import {
  fromAtividades,
  fromDemands,
  CAPACIDADES_ATIVIDADES,
  CAPACIDADES_DEMANDS,
  type Capacidades,
  type Demanda,
  type Pessoa,
  type Sistema,
} from "@/domain/demand";

/**
 * A fila do dia é a única visão que precisa enxergar as duas fontes ao mesmo
 * tempo — "Hoje" não é de um projeto, é do desenvolvedor. `useDemandas` (que
 * alimenta o Workspace de um projeto) resolve para UMA fonte por escopo; aqui
 * somamos as duas: todo card de `atividades_cards`, de qualquer quadro, mais
 * toda linha de `demands`.
 *
 * `listCards`/`listColunas`/`listLabels` já aceitam `boardId` opcional — sem
 * ele, devolvem todos os quadros numa consulta só. Não precisamos de uma
 * consulta por projeto.
 *
 * `capacidades` aqui é a União das duas fontes: cada campo já é checado por
 * si mesmo antes de aparecer (`d.tipo && ...`, `d.ia && ...` em
 * `DemandaRow`), então dizer "esta lista sabe responder X" quando qualquer
 * uma das fontes sabe é seguro — quem não tem o dado simplesmente não mostra.
 */
const CAPACIDADES_MISTA: Capacidades = {
  sla: CAPACIDADES_ATIVIDADES.sla || CAPACIDADES_DEMANDS.sla,
  ia: CAPACIDADES_ATIVIDADES.ia || CAPACIDADES_DEMANDS.ia,
  tipo: CAPACIDADES_ATIVIDADES.tipo || CAPACIDADES_DEMANDS.tipo,
  complexidade: CAPACIDADES_ATIVIDADES.complexidade || CAPACIDADES_DEMANDS.complexidade,
  auditoria: CAPACIDADES_ATIVIDADES.auditoria || CAPACIDADES_DEMANDS.auditoria,
  comentarios: CAPACIDADES_ATIVIDADES.comentarios || CAPACIDADES_DEMANDS.comentarios,
  progresso: CAPACIDADES_ATIVIDADES.progresso || CAPACIDADES_DEMANDS.progresso,
  etiquetas: CAPACIDADES_ATIVIDADES.etiquetas || CAPACIDADES_DEMANDS.etiquetas,
  prazo: CAPACIDADES_ATIVIDADES.prazo || CAPACIDADES_DEMANDS.prazo,
};

export interface EstadoTodasAsDemandas {
  demandas: Demanda[];
  /** id da demanda -> id do projeto (`atividades`) para montar o link `/demandas/:id?projeto=`. Ausente = fila global. */
  projetoPorDemanda: Map<string, string>;
  capacidades: Capacidades;
  carregando: boolean;
  erro: Error | null;
}

export interface OpcoesTodasAsDemandas {
  /**
   * ISOLAMENTO DE CONTEXTO
   *
   * A fila de triagem (Helpdesk) e o trabalho de um projeto são duas coisas
   * diferentes: somar as duas enche a fila de chamados com tarefas de Sprint,
   * que já têm o quadro do projeto como lugar próprio. Quem quer só chamados
   * passa `false` — e aí as consultas de cartões nem saem do navegador.
   *
   * Padrão `true` para não mudar quem já chamava sem opção.
   */
  incluirCartoesDeProjeto?: boolean;
}

export function useTodasAsDemandas(
  opcoes: OpcoesTodasAsDemandas = {},
): EstadoTodasAsDemandas {
  const { incluirCartoesDeProjeto = true } = opcoes;
  const cardsQ = useQuery({
    queryKey: [...atividadesKeys.all, "cards", "todos-os-quadros"],
    queryFn: () => listCards(),
    enabled: incluirCartoesDeProjeto,
    staleTime: 30_000,
  });

  /**
   * ARQUIVAR UM PROJETO PRECISA TIRAR AS DEMANDAS DELE DA FILA
   *
   * `listCards()` traz os cartões de TODOS os quadros e não pergunta se o
   * quadro ainda vale. O resultado é que arquivar um projeto o tirava da lista
   * de projetos e deixava as demandas dele em "Hoje", como se nada tivesse
   * acontecido — um botão que promete uma coisa e entrega meia.
   *
   * Pior que não funcionar: arquivar passa a ser um gesto que a pessoa faz e
   * depois desconfia, porque o efeito visível contradiz o esperado.
   *
   * Mesma chave de cache da lista de projetos, então não há ida a mais ao
   * servidor: as duas telas compartilham a resposta.
   */
  const boardsQ = useQuery({
    queryKey: ["atividades", "boards-resumo"],
    queryFn: listBoardsResumo,
    enabled: incluirCartoesDeProjeto,
    staleTime: 60_000,
  });
  const colunasQ = useQuery({
    queryKey: [...atividadesKeys.all, "colunas", "todos-os-quadros"],
    queryFn: () => listColunas(),
    enabled: incluirCartoesDeProjeto,
    staleTime: 30_000,
  });
  const labelsQ = useQuery({
    queryKey: [...atividadesKeys.all, "labels", "todos-os-quadros"],
    queryFn: () => listLabels(),
    enabled: incluirCartoesDeProjeto,
    staleTime: 30_000,
  });
  const personasQ = useQuery({
    queryKey: atividadesKeys.personas(),
    queryFn: listPersonas,
    enabled: incluirCartoesDeProjeto,
    staleTime: 5 * 60_000,
  });
  const responsaveisQ = useQuery({
    queryKey: atividadesKeys.responsaveis(),
    queryFn: listAssignableUsers,
    enabled: incluirCartoesDeProjeto,
    staleTime: 5 * 60_000,
  });

  const solucoesQ = useQuery({
    queryKey: atividadesKeys.solucoes(),
    queryFn: listSolucoes,
    staleTime: 5 * 60_000,
  });

  const demandsQ = useDemands();
  const demandsList = useMemo(() => demandsQ.data ?? [], [demandsQ.data]);
  const perfisQ = useDemandProfiles(demandsList);

  const quadrosArquivados = useMemo(
    () => new Set((boardsQ.data ?? []).filter((b) => b.arquivado).map((b) => b.id)),
    [boardsQ.data],
  );

  const demandas = useMemo<Demanda[]>(() => {
    const { demandas: dasAtividades } = fromAtividades({
      cards: (cardsQ.data ?? []).filter((c) => !quadrosArquivados.has(c.boardId)),
      colunas: colunasQ.data ?? [],
      labels: labelsQ.data ?? [],
      personas: personasQ.data ?? [],
      responsaveis: responsaveisQ.data ?? [],
      solucoes: solucoesQ.data ?? [],
    });

    // Mesmo defeito de `useDemandas`, herdado por cópia: `Map` percorrido com
    // `Object.entries` nunca rende nada, e o perfil expõe `avatar_url`.
    const pessoasPorId = new Map<string, Pessoa>();
    for (const [id, perfil] of perfisQ.data ?? new Map()) {
      pessoasPorId.set(id, {
        id,
        nome: perfil?.nome ?? "—",
        avatarUrl: perfil?.avatar_url ?? null,
      });
    }
    const sistemasPorId = new Map<string, Sistema>();
    for (const s of solucoesQ.data ?? []) sistemasPorId.set(s.id, { id: s.id, nome: s.titulo });

    const { demandas: dasDemands } = fromDemands({
      demands: demandsList,
      pessoasPorId,
      sistemasPorId,
    });

    return [...dasAtividades, ...dasDemands];
  }, [
    cardsQ.data,
    colunasQ.data,
    labelsQ.data,
    personasQ.data,
    responsaveisQ.data,
    solucoesQ.data,
    demandsList,
    perfisQ.data,
    quadrosArquivados,
  ]);

  const projetoPorDemanda = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const card of cardsQ.data ?? []) {
      if (quadrosArquivados.has(card.boardId)) continue;
      mapa.set(card.id, card.boardId);
    }
    return mapa;
  }, [cardsQ.data]);

  const carregando =
    cardsQ.isLoading ||
    colunasQ.isLoading ||
    labelsQ.isLoading ||
    personasQ.isLoading ||
    responsaveisQ.isLoading ||
    solucoesQ.isLoading ||
    demandsQ.isLoading;

  const erro =
    (cardsQ.error as Error | null) ??
    (colunasQ.error as Error | null) ??
    (demandsQ.error as Error | null) ??
    null;

  return { demandas, projetoPorDemanda, capacidades: CAPACIDADES_MISTA, carregando, erro };
}
