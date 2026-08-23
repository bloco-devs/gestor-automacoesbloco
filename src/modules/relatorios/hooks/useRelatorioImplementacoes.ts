import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  buscarImplementacoes,
  buscarOpcoesDeFiltro,
  type LinhaDeImplementacao,
  type OpcaoDeFiltro,
} from "../services/relatorios-data";
import { periodoDoAtalho, periodoPersonalizado } from "../services/relatorios-service";
import type { AtalhoDePeriodo, Periodo } from "../types";

const STALE = 30_000;

export interface EstadoDosFiltros {
  atalho: AtalhoDePeriodo;
  de: string;
  ate: string;
  sistema: string | null;
  responsavel: string | null;
  busca: string;
}

const HOJE_ISO = () => new Date().toISOString().slice(0, 10);

export const FILTROS_INICIAIS: EstadoDosFiltros = {
  atalho: "este_mes",
  de: HOJE_ISO(),
  ate: HOJE_ISO(),
  sistema: null,
  responsavel: null,
  busca: "",
};

export interface ResumoDoRelatorio {
  total: number;
  sistemas: number;
  responsaveis: number;
  comEvidencia: number;
  tarefasFeitas: number;
  tarefasTotal: number;
  porSistema: Array<{ sistema: string; quantidade: number }>;
  porResponsavel: Array<{ nome: string; quantidade: number }>;
  porTipo: Array<{ tipo: string; quantidade: number }>;
}

function resumir(linhas: LinhaDeImplementacao[]): ResumoDoRelatorio {
  const contar = <T extends string>(chaves: T[]) => {
    const m = new Map<T, number>();
    for (const k of chaves) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()]
      .map(([k, quantidade]) => ({ k, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  };

  const sistemas = contar(linhas.map((l) => l.sistema_slug ?? "Sem sistema"));
  const responsaveis = contar(linhas.map((l) => l.responsavel_nome ?? "Sem responsável"));
  const tipos = contar(linhas.map((l) => l.tipo));

  return {
    total: linhas.length,
    sistemas: sistemas.length,
    responsaveis: responsaveis.length,
    // Evidência é anexo OU comentário de gente. Nada é inventado: se a demanda
    // não tem nem um nem outro, ela conta como sem evidência registrada.
    comEvidencia: linhas.filter((l) => l.anexos > 0 || l.comentarios > 0).length,
    tarefasFeitas: linhas.reduce((s, l) => s + l.tarefas_feitas, 0),
    tarefasTotal: linhas.reduce((s, l) => s + l.tarefas_total, 0),
    porSistema: sistemas.map((s) => ({ sistema: s.k, quantidade: s.quantidade })),
    porResponsavel: responsaveis.map((r) => ({ nome: r.k, quantidade: r.quantidade })),
    porTipo: tipos.map((t) => ({ tipo: t.k, quantidade: t.quantidade })),
  };
}

export function useRelatorioImplementacoes() {
  const [filtros, setFiltros] = useState<EstadoDosFiltros>(FILTROS_INICIAIS);

  const periodo: Periodo = useMemo(
    () =>
      filtros.atalho === "personalizado"
        ? periodoPersonalizado(filtros.de, filtros.ate)
        : periodoDoAtalho(filtros.atalho),
    [filtros.atalho, filtros.de, filtros.ate],
  );

  const consulta = useQuery({
    queryKey: [
      "relatorio",
      "implementacoes",
      periodo.inicio.toISOString(),
      periodo.fim.toISOString(),
      filtros.sistema,
      filtros.responsavel,
      filtros.busca,
    ],
    queryFn: () =>
      buscarImplementacoes({
        inicio: periodo.inicio,
        fim: periodo.fim,
        sistema: filtros.sistema,
        responsavel: filtros.responsavel,
        busca: filtros.busca.trim() || null,
      }),
    staleTime: STALE,
  });

  // Os seletores acompanham o período: só oferecem sistema e pessoa que têm
  // entrega no intervalo escolhido. Não filtram pelo que já está selecionado,
  // senão escolher um sistema apagaria os outros da lista.
  const opcoes = useQuery({
    queryKey: ["relatorio", "filtros", periodo.inicio.toISOString(), periodo.fim.toISOString()],
    queryFn: () => buscarOpcoesDeFiltro(periodo.inicio, periodo.fim),
    staleTime: STALE,
  });

  const linhas = consulta.data ?? [];

  return {
    filtros,
    setFiltros,
    periodo,
    linhas,
    resumo: useMemo(() => resumir(linhas), [linhas]),
    sistemas: (opcoes.data ?? []).filter((o: OpcaoDeFiltro) => o.tipo === "sistema"),
    responsaveis: (opcoes.data ?? []).filter((o: OpcaoDeFiltro) => o.tipo === "responsavel"),
    carregando: consulta.isLoading,
    erro: consulta.error as Error | null,
    recarregar: () => {
      void consulta.refetch();
      void opcoes.refetch();
    },
  };
}
