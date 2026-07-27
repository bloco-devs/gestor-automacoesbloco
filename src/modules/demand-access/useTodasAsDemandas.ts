import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCards, listColunas, listLabels, listPersonas } from "@/lib/atividades";
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

export function useTodasAsDemandas(): EstadoTodasAsDemandas {
  const cardsQ = useQuery({
    queryKey: [...atividadesKeys.all, "cards", "todos-os-quadros"],
    queryFn: () => listCards(),
    staleTime: 30_000,
  });
  const colunasQ = useQuery({
    queryKey: [...atividadesKeys.all, "colunas", "todos-os-quadros"],
    queryFn: () => listColunas(),
    staleTime: 30_000,
  });
  const labelsQ = useQuery({
    queryKey: [...atividadesKeys.all, "labels", "todos-os-quadros"],
    queryFn: () => listLabels(),
    staleTime: 30_000,
  });
  const personasQ = useQuery({
    queryKey: atividadesKeys.personas(),
    queryFn: listPersonas,
    staleTime: 5 * 60_000,
  });
  const responsaveisQ = useQuery({
    queryKey: atividadesKeys.responsaveis(),
    queryFn: listAssignableUsers,
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

  const demandas = useMemo<Demanda[]>(() => {
    const { demandas: dasAtividades } = fromAtividades({
      cards: cardsQ.data ?? [],
      colunas: colunasQ.data ?? [],
      labels: labelsQ.data ?? [],
      personas: personasQ.data ?? [],
      responsaveis: responsaveisQ.data ?? [],
      solucoes: solucoesQ.data ?? [],
    });

    const pessoasPorId = new Map<string, Pessoa>();
    for (const [id, perfil] of Object.entries(perfisQ.data ?? {})) {
      const p = perfil as { nome?: string; avatarUrl?: string | null } | undefined;
      pessoasPorId.set(id, { id, nome: p?.nome ?? "—", avatarUrl: p?.avatarUrl ?? null });
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
  ]);

  const projetoPorDemanda = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const card of cardsQ.data ?? []) mapa.set(card.id, card.boardId);
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
