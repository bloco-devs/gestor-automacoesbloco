import {
  RISCO_SEVERIDADE,
  type Demanda,
  type Pessoa,
  type Prioridade,
  type Risco,
  type StatusCategoria,
} from "../types";
import { DIAS_PARA_PARADA, janelaDoPrazo } from "./risco";

/**
 * DemandaQuery — filas, lentes e resumos.
 *
 * Aqui mora a ideia central do redesign: **fila × lente = uma tela**.
 *
 *   FILA   recorta QUAIS demandas (minhas, não atribuídas, em risco…)
 *   LENTE  decide COMO agrupar (status, janela de entrega, atividade)
 *
 * As cinco visualizações não são cinco telas: são a mesma lista com dois
 * parâmetros. Por isso tudo aqui é função pura sobre `Demanda[]` — nenhuma
 * lente pode discordar de outra, porque nenhuma tem lógica própria.
 */

// ---------------------------------------------------------------------------
// Filas
// ---------------------------------------------------------------------------

export type FilaId = "todas" | "minhas" | "sem_responsavel" | "vencendo_hoje" | "em_risco" | "concluidas";

export interface Fila {
  id: FilaId;
  rotulo: string;
  /** Frase curta que explica o recorte. Fila sem explicação vira adivinhação. */
  ajuda: string;
}

export const FILAS: Fila[] = [
  { id: "todas", rotulo: "Todas", ajuda: "Tudo que existe neste recorte" },
  { id: "minhas", rotulo: "Minhas", ajuda: "Onde você é responsável" },
  { id: "sem_responsavel", rotulo: "Não atribuídas", ajuda: "Abertas e sem ninguém responsável" },
  { id: "vencendo_hoje", rotulo: "Vencendo hoje", ajuda: "Prazo ou SLA vence até o fim do dia" },
  { id: "em_risco", rotulo: "Em risco", ajuda: "Atrasadas, SLA estourado ou paradas" },
  { id: "concluidas", rotulo: "Concluídas", ajuda: "Trabalho encerrado" },
];

export function aplicarFila(demandas: Demanda[], fila: FilaId, usuarioId: string | null): Demanda[] {
  switch (fila) {
    case "minhas":
      // Cobre tanto `u:<id>` (adapter de atividades) quanto o id puro (demands).
      return demandas.filter(
        (d) => !d.concluida && usuarioId !== null && d.responsaveis.some((p) => p.id === usuarioId || p.id === `u:${usuarioId}`),
      );
    case "sem_responsavel":
      return demandas.filter((d) => !d.concluida && d.responsaveis.length === 0);
    case "vencendo_hoje":
      return demandas.filter((d) => !d.concluida && janelaDoPrazo(d.prazo) === "hoje");
    case "em_risco":
      return demandas.filter((d) => d.risco !== null);
    case "concluidas":
      return demandas.filter((d) => d.concluida);
    case "todas":
    default:
      return demandas;
  }
}

/** Contagem de cada fila, para os números na barra. Um número que ninguém contou não existe. */
export function contarFilas(demandas: Demanda[], usuarioId: string | null): Record<FilaId, number> {
  return FILAS.reduce(
    (acc, f) => {
      acc[f.id] = aplicarFila(demandas, f.id, usuarioId).length;
      return acc;
    },
    {} as Record<FilaId, number>,
  );
}

// ---------------------------------------------------------------------------
// Busca textual
// ---------------------------------------------------------------------------

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function buscar(demandas: Demanda[], termo: string): Demanda[] {
  const t = normalizar(termo.trim());
  if (!t) return demandas;
  return demandas.filter((d) =>
    [
      d.titulo,
      d.descricao,
      d.referencia,
      d.status.rotulo,
      d.sistema?.nome ?? "",
      ...d.responsaveis.map((p) => p.nome),
      ...d.etiquetas.map((e) => e.nome),
    ].some((campo) => normalizar(campo).includes(t)),
  );
}

// ---------------------------------------------------------------------------
// Ordenação por atenção
// ---------------------------------------------------------------------------

const PESO_PRIORIDADE: Record<Prioridade, number> = { critica: 40, alta: 30, media: 20, baixa: 10 };

/** Maior = precisa de você antes. Concluídas vão para o fim. */
export function pesoDeAtencao(d: Demanda): number {
  if (d.concluida) return -1;
  let peso = d.risco ? RISCO_SEVERIDADE[d.risco] : 0;
  if (d.prioridade) peso += PESO_PRIORIDADE[d.prioridade];
  peso += Math.min(d.diasParada, 60) / 10;
  return peso;
}

export function ordenarPorAtencao(demandas: Demanda[]): Demanda[] {
  return [...demandas].sort((a, b) => pesoDeAtencao(b) - pesoDeAtencao(a));
}

// ---------------------------------------------------------------------------
// Lentes — o que muda é só o critério de corte
// ---------------------------------------------------------------------------

export type LenteId = "lista" | "board" | "sprint" | "timeline" | "gantt";

export interface Grupo {
  id: string;
  rotulo: string;
  ajuda?: string;
  itens: Demanda[];
}

const ORDEM_CATEGORIA: Record<StatusCategoria, number> = {
  aberta: 0,
  andamento: 1,
  espera: 2,
  concluida: 3,
};

/** Lista e Board: agrupa por status, na ordem da esteira. */
export function agruparPorStatus(demandas: Demanda[]): Grupo[] {
  const mapa = new Map<string, Grupo & { ordem: number; categoria: StatusCategoria }>();
  for (const d of demandas) {
    const atual = mapa.get(d.status.id);
    if (atual) atual.itens.push(d);
    else
      mapa.set(d.status.id, {
        id: d.status.id,
        rotulo: d.status.rotulo,
        itens: [d],
        ordem: d.status.ordem,
        categoria: d.status.categoria,
      });
  }
  return [...mapa.values()]
    .sort((a, b) => ORDEM_CATEGORIA[a.categoria] - ORDEM_CATEGORIA[b.categoria] || a.ordem - b.ordem)
    .map(({ id, rotulo, itens }) => ({ id, rotulo, itens: ordenarPorAtencao(itens) }));
}

/**
 * Sprint: agrupa por janela de entrega.
 *
 * Não existe entidade "sprint" em nenhuma das duas fontes. Em vez de inventar
 * uma, derivamos das datas — e a ajuda de cada grupo diz exatamente o critério,
 * para o usuário não achar que existe um planejamento formal que não existe.
 */
export function agruparPorJanela(demandas: Demanda[]): Grupo[] {
  const grupos: Grupo[] = [
    { id: "risco", rotulo: "Precisa de atenção", ajuda: "Atrasadas, SLA estourado, paradas ou vencendo hoje", itens: [] },
    { id: "semana", rotulo: "Próximos 7 dias", itens: [] },
    { id: "depois", rotulo: "Depois", itens: [] },
    { id: "sem_prazo", rotulo: "Sem prazo definido", itens: [] },
    { id: "concluidas", rotulo: "Concluídas", itens: [] },
  ];
  const por = Object.fromEntries(grupos.map((g) => [g.id, g])) as Record<string, Grupo>;

  const RISCOS_URGENTES: Risco[] = ["sla_estourado", "atrasada", "vence_hoje", "parada", "sla_atencao"];

  for (const d of demandas) {
    if (d.concluida) por.concluidas.itens.push(d);
    else if (d.risco && RISCOS_URGENTES.includes(d.risco)) por.risco.itens.push(d);
    else {
      const janela = janelaDoPrazo(d.prazo);
      if (janela === "em_breve") por.semana.itens.push(d);
      else if (janela === "sem_prazo") por.sem_prazo.itens.push(d);
      else por.depois.itens.push(d);
    }
  }
  for (const g of grupos) g.itens = ordenarPorAtencao(g.itens);
  return grupos.filter((g) => g.itens.length > 0);
}

/** Timeline: agrupa por quando foi mexido pela última vez. */
export function agruparPorAtividade(demandas: Demanda[]): Grupo[] {
  const grupos: Grupo[] = [
    { id: "hoje", rotulo: "Hoje", itens: [] },
    { id: "semana", rotulo: "Últimos 7 dias", itens: [] },
    { id: "mes", rotulo: "Últimos 30 dias", itens: [] },
    { id: "antes", rotulo: "Há mais de 30 dias", itens: [] },
  ];
  const por = Object.fromEntries(grupos.map((g) => [g.id, g])) as Record<string, Grupo>;
  for (const d of demandas) {
    if (d.diasParada < 1) por.hoje.itens.push(d);
    else if (d.diasParada <= 7) por.semana.itens.push(d);
    else if (d.diasParada <= 30) por.mes.itens.push(d);
    else por.antes.itens.push(d);
  }
  for (const g of grupos) g.itens.sort((a, b) => a.diasParada - b.diasParada);
  return grupos.filter((g) => g.itens.length > 0);
}

export function agrupar(demandas: Demanda[], lente: LenteId): Grupo[] {
  switch (lente) {
    case "sprint":
      return agruparPorJanela(demandas);
    case "timeline":
      return agruparPorAtividade(demandas);
    case "lista":
    case "board":
    case "gantt":
    default:
      return agruparPorStatus(demandas);
  }
}

// ---------------------------------------------------------------------------
// Resumo — alimenta o cabeçalho e o Copiloto
// ---------------------------------------------------------------------------

export interface CargaPessoa {
  pessoa: Pessoa;
  abertas: number;
  emRisco: number;
}

export interface Resumo {
  total: number;
  concluidas: number;
  abertas: number;
  emRisco: number;
  slaEstourado: number;
  atrasadas: number;
  paradas: number;
  semResponsavel: number;
  /** 0–100, por contagem de concluídas. */
  progresso: number;
  ultimaAtividade: string | null;
  /** A demanda mais urgente aberta. É o "comece por aqui" do Copiloto. */
  maiorRisco: Demanda | null;
  /** Próxima data com entregas, e quantas caem nela. */
  proximaEntrega: { data: string; quantidade: number } | null;
  carga: CargaPessoa[];
  /** `true` quando nada exige atenção. Estado saudável também é resposta. */
  saudavel: boolean;
}

export function resumir(demandas: Demanda[]): Resumo {
  const total = demandas.length;
  const concluidas = demandas.filter((d) => d.concluida).length;
  const abertas = demandas.filter((d) => !d.concluida);

  const emRisco = demandas.filter((d) => d.risco !== null).length;
  const slaEstourado = demandas.filter((d) => d.risco === "sla_estourado").length;
  const atrasadas = demandas.filter((d) => d.risco === "atrasada").length;
  const paradas = demandas.filter((d) => d.risco === "parada").length;
  const semResponsavel = abertas.filter((d) => d.responsaveis.length === 0).length;

  let ultimaAtividade: string | null = null;
  for (const d of demandas) {
    if (!ultimaAtividade || new Date(d.atualizadaEm) > new Date(ultimaAtividade)) {
      ultimaAtividade = d.atualizadaEm;
    }
  }

  const ordenadas = ordenarPorAtencao(abertas);
  const maiorRisco = ordenadas.find((d) => d.risco !== null) ?? ordenadas[0] ?? null;

  // Próxima entrega: a data futura mais próxima com pelo menos uma demanda.
  const futuras = abertas
    .filter((d) => d.prazo && new Date(d.prazo).getTime() >= Date.now())
    .sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1));
  const proximaEntrega = futuras.length
    ? {
        data: futuras[0].prazo!,
        quantidade: futuras.filter(
          (d) => new Date(d.prazo!).toDateString() === new Date(futuras[0].prazo!).toDateString(),
        ).length,
      }
    : null;

  // Carga por pessoa: quantas abertas e quantas em risco. Responde "quem está
  // afogado?" sem precisar de relatório.
  const cargaMapa = new Map<string, CargaPessoa>();
  for (const d of abertas) {
    for (const p of d.responsaveis) {
      const atual = cargaMapa.get(p.id) ?? { pessoa: p, abertas: 0, emRisco: 0 };
      atual.abertas += 1;
      if (d.risco) atual.emRisco += 1;
      cargaMapa.set(p.id, atual);
    }
  }

  return {
    total,
    concluidas,
    abertas: abertas.length,
    emRisco,
    slaEstourado,
    atrasadas,
    paradas,
    semResponsavel,
    progresso: total > 0 ? Math.round((concluidas / total) * 100) : 0,
    ultimaAtividade,
    maiorRisco,
    proximaEntrega,
    carga: [...cargaMapa.values()].sort((a, b) => b.abertas - a.abertas),
    saudavel: emRisco === 0 && semResponsavel === 0,
  };
}

// ---------------------------------------------------------------------------
// Semelhança — base da detecção de duplicidade
// ---------------------------------------------------------------------------

/**
 * Palavras significativas de um título.
 *
 * Remove o prefixo de código do projeto (`[GO-11]`, `[IN-05]`) porque ele é
 * identificador, não conteúdo — e duas demandas do mesmo projeto compartilham
 * o prefixo sem terem nada a ver uma com a outra.
 */
function tokens(texto: string): Set<string> {
  return new Set(
    normalizar(texto)
      .replace(/\[[^\]]*\]/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3),
  );
}

/**
 * Demandas que parecem ser a mesma coisa.
 *
 * COMO ESTA FUNÇÃO ESTAVA ERRADA
 * A primeira versão montava os tokens do alvo a partir de título + descrição e
 * comparava contra o título dos outros, exigindo 2 palavras em comum. Uma
 * descrição longa gera dezenas de tokens, então quase tudo batia: na tela real,
 * "ADR sobre papel engenheiro" apareceu como duplicata de "Popular
 * usuario_acessos + onboarding" porque a descrição do primeiro citava acessos e
 * onboarding.
 *
 * Falso positivo aqui é caro: o painel existe para o usuário confiar nele. Um
 * alerta errado ensina a ignorar todos os outros.
 *
 * A correção tem três partes:
 *   1. compara título com título — descrição é ruído para semelhança;
 *   2. exige proporção, não contagem: metade das palavras do título mais curto
 *      precisa coincidir, então títulos curtos não casam por acidente;
 *   3. ignora o prefixo de código do projeto.
 */
export function semelhantes(alvo: Demanda, universo: Demanda[], limite = 3): Demanda[] {
  const alvoTokens = tokens(alvo.titulo);
  if (alvoTokens.size < 2) return [];

  return universo
    .filter((d) => d.id !== alvo.id)
    .map((d) => {
      const outroTokens = tokens(d.titulo);
      if (outroTokens.size < 2) return { d, proporcao: 0, comuns: 0 };
      let comuns = 0;
      for (const t of outroTokens) if (alvoTokens.has(t)) comuns += 1;
      const menor = Math.min(alvoTokens.size, outroTokens.size);
      return { d, comuns, proporcao: comuns / menor };
    })
    .filter((x) => x.comuns >= 2 && x.proporcao >= 0.5)
    .sort((a, b) => b.proporcao - a.proporcao || b.comuns - a.comuns)
    .slice(0, limite)
    .map((x) => x.d);
}

export { DIAS_PARA_PARADA };
