/**
 * Funções PURAS do módulo de relatórios. Nenhuma toca banco nem rede — é o
 * que permite testá-las de verdade, e é onde moram as contas que, se
 * estiverem erradas, pagam ou deixam de pagar alguém.
 *
 * Duas regras que valem para o arquivo inteiro:
 *
 *   1. Todo corte de data é em America/Sao_Paulo. Nunca offset fixo, nunca
 *      UTC. Uma demanda concluída às 21h30 do dia 19 em Brasília é 00h30 do
 *      dia 20 em UTC — cortar em UTC tiraria essa pessoa do ciclo.
 *
 *   2. Todo intervalo é SEMIABERTO: `inicio <= x < fim`. "Até o dia 19"
 *      significa incluir o dia 19 inteiro, então o fim é o dia 20 às 00:00.
 */

import type {
  AtalhoDePeriodo,
  Ciclo,
  Faixa,
  Periodo,
  ResultadoDaFaixa,
  TipoDeClassificacao,
} from "../types";
import { FUSO } from "../types";

// ---------------------------------------------------------------------------
// Fuso horário
// ---------------------------------------------------------------------------

const PARTES = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Como o instante `d` aparece no relógio de São Paulo. */
export function partesEmSaoPaulo(d: Date) {
  const p = PARTES.formatToParts(d);
  const pega = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return {
    ano: pega("year"),
    mes: pega("month"),
    dia: pega("day"),
    // 24:00 aparece em algumas engines no lugar de 00:00.
    hora: pega("hour") % 24,
    minuto: pega("minute"),
    segundo: pega("second"),
  };
}

/**
 * O instante UTC correspondente a uma hora de parede em São Paulo.
 *
 * O truque das duas passadas é o jeito padrão de fazer isso sem biblioteca:
 * chuta que a hora local é UTC, mede o quanto errou, corrige, e confere de
 * novo — a segunda passada existe para o caso de o primeiro chute cair do
 * outro lado de uma mudança de regra de fuso.
 */
export function deSaoPauloParaUtc(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0,
): Date {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto, segundo, ms);
  let instante = alvo;
  for (let i = 0; i < 2; i++) {
    const p = partesEmSaoPaulo(new Date(instante));
    const comoAparece = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo, ms);
    const erro = comoAparece - alvo;
    if (erro === 0) break;
    instante -= erro;
  }
  return new Date(instante);
}

// ---------------------------------------------------------------------------
// Ciclo de apuração — 20 → 19
// ---------------------------------------------------------------------------

/**
 * A janela do ciclo de um mês de referência.
 *
 *   referência setembro/2026  →  [20/08/2026 00:00, 20/09/2026 00:00)
 *
 * Espelha exatamente `relatorio_ciclo_janela` no banco. O banco continua
 * sendo a autoridade — isto existe para prévia na tela e para teste.
 */
export function janelaDoCiclo(ano: number, mes: number): Periodo {
  const inicio = deSaoPauloParaUtc(mes === 1 ? ano - 1 : ano, mes === 1 ? 12 : mes - 1, 20);
  const fim = deSaoPauloParaUtc(ano, mes, 20);
  return { inicio, fim, rotulo: `${nomeDoMes(mes)}/${ano}` };
}

/** `inicio <= momento < fim`. O dia 19 inteiro entra; o dia 20 não. */
export function dentroDoCiclo(momento: Date | string, ciclo: Pick<Ciclo, "inicio" | "fim">): boolean {
  const t = typeof momento === "string" ? new Date(momento).getTime() : momento.getTime();
  return t >= new Date(ciclo.inicio).getTime() && t < new Date(ciclo.fim).getTime();
}

/** Qual ciclo contém o momento. `null` quando nenhum — não chuta o mais próximo. */
export function cicloDe(momento: Date | string, ciclos: Ciclo[]): Ciclo | null {
  return ciclos.find((c) => dentroDoCiclo(momento, c)) ?? null;
}

// ---------------------------------------------------------------------------
// Pontos
// ---------------------------------------------------------------------------

/**
 * Pontos de uma classificação. Devolve `null` quando não há classificação
 * definida — e `null` não é zero: é "ninguém classificou ainda".
 */
export function pontosDe(
  codigo: string | null | undefined,
  tipos: TipoDeClassificacao[],
): number | null {
  if (!codigo) return null;
  return tipos.find((t) => t.codigo === codigo)?.pontos ?? null;
}

/** Soma só o que tem classificação. O resto fica de fora, sem virar zero. */
export function somarPontos(
  itens: Array<{ classificacao: string | null }>,
  tipos: TipoDeClassificacao[],
): { total: number; classificados: number; pendentes: number } {
  let total = 0;
  let classificados = 0;
  let pendentes = 0;
  for (const item of itens) {
    const p = pontosDe(item.classificacao, tipos);
    if (p === null) pendentes++;
    else {
      total += p;
      classificados++;
    }
  }
  return { total, classificados, pendentes };
}

/** Quantas de cada classificação, na ordem configurada. */
export function contarPorClassificacao(
  itens: Array<{ classificacao: string | null }>,
  tipos: TipoDeClassificacao[],
): Array<{ tipo: TipoDeClassificacao; quantidade: number; pontos: number }> {
  return [...tipos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((tipo) => {
      const quantidade = itens.filter((i) => i.classificacao === tipo.codigo).length;
      return { tipo, quantidade, pontos: quantidade * tipo.pontos };
    });
}

// ---------------------------------------------------------------------------
// Meta e faixa
// ---------------------------------------------------------------------------

/** Percentual de alcance da meta da equipe. Arredondado em 4 casas. */
export function percentualDeAlcance(pontos: number, metaPontos: number): number {
  if (metaPontos <= 0) return 0;
  return Math.round((pontos / metaPontos) * 100 * 10000) / 10000;
}

const SEM_FAIXA = "Faixa de remuneração não definida";

/**
 * Resolve o percentual para uma faixa. Espelha `relatorio_faixa_para`:
 * `>= min AND (max nulo OU <= max)`, e no empate ganha o maior `min`.
 *
 * OS DOIS CASOS DE "NÃO DEFINIDA" SÃO O MESMO PARA QUEM LÊ.
 *
 * Existe faixa cadastrada sem valor (o intervalo de 100,01% a 119,99%, que o
 * RH ainda não definiu) e existe percentual que não cai em faixa nenhuma.
 * São situações diferentes no banco e idênticas na tela: em nenhuma das duas
 * o sistema pode exibir um número em reais.
 */
export function resolverFaixa(percentual: number, faixas: Faixa[]): ResultadoDaFaixa {
  const candidatas = faixas
    .filter(
      (f) =>
        percentual >= f.percentualMin &&
        (f.percentualMax === null || percentual <= f.percentualMax),
    )
    .sort((a, b) => b.percentualMin - a.percentualMin);

  const faixa = candidatas[0] ?? null;

  if (!faixa) {
    return { faixa: null, valorReais: null, indefinida: true, mensagem: SEM_FAIXA };
  }
  if (faixa.valorReais === null) {
    return { faixa, valorReais: null, indefinida: true, mensagem: SEM_FAIXA };
  }
  return {
    faixa,
    valorReais: faixa.valorReais,
    indefinida: false,
    mensagem: faixa.rotulo ?? "",
  };
}

// ---------------------------------------------------------------------------
// Períodos do relatório técnico — cronológicos, sem relação com o dia 19
// ---------------------------------------------------------------------------

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function nomeDoMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

/**
 * Os atalhos de período do relatório técnico. Nenhum deles conhece o dia 19 —
 * "este mês" é o mês inteiro, do dia 1 ao último dia, porque o histórico
 * técnico não é cortado pela folha.
 *
 * `agora` é injetável para o teste não depender do relógio.
 */
export function periodoDoAtalho(atalho: AtalhoDePeriodo, agora: Date = new Date()): Periodo {
  const h = partesEmSaoPaulo(agora);
  const diaLocal = (ano: number, mes: number, dia: number) => deSaoPauloParaUtc(ano, mes, dia);
  const maisDias = (ano: number, mes: number, dia: number, n: number) => {
    const base = Date.UTC(ano, mes - 1, dia + n);
    const d = new Date(base);
    return deSaoPauloParaUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  };

  switch (atalho) {
    case "hoje":
      return { inicio: diaLocal(h.ano, h.mes, h.dia), fim: maisDias(h.ano, h.mes, h.dia, 1), rotulo: "Hoje" };

    case "ontem":
      return { inicio: maisDias(h.ano, h.mes, h.dia, -1), fim: diaLocal(h.ano, h.mes, h.dia), rotulo: "Ontem" };

    case "ultimos7":
      return { inicio: maisDias(h.ano, h.mes, h.dia, -6), fim: maisDias(h.ano, h.mes, h.dia, 1), rotulo: "Últimos 7 dias" };

    case "esta_semana": {
      // Semana começa na segunda, como no calendário brasileiro.
      const diaSemana = new Date(Date.UTC(h.ano, h.mes - 1, h.dia)).getUTCDay();
      const recuo = (diaSemana + 6) % 7;
      return {
        inicio: maisDias(h.ano, h.mes, h.dia, -recuo),
        fim: maisDias(h.ano, h.mes, h.dia, 7 - recuo),
        rotulo: "Esta semana",
      };
    }

    case "semana_anterior": {
      const diaSemana = new Date(Date.UTC(h.ano, h.mes - 1, h.dia)).getUTCDay();
      const recuo = (diaSemana + 6) % 7;
      return {
        inicio: maisDias(h.ano, h.mes, h.dia, -recuo - 7),
        fim: maisDias(h.ano, h.mes, h.dia, -recuo),
        rotulo: "Semana anterior",
      };
    }

    case "este_mes":
      return {
        inicio: diaLocal(h.ano, h.mes, 1),
        fim: h.mes === 12 ? diaLocal(h.ano + 1, 1, 1) : diaLocal(h.ano, h.mes + 1, 1),
        rotulo: `${nomeDoMes(h.mes)}/${h.ano}`,
      };

    case "mes_anterior": {
      const ano = h.mes === 1 ? h.ano - 1 : h.ano;
      const mes = h.mes === 1 ? 12 : h.mes - 1;
      return {
        inicio: diaLocal(ano, mes, 1),
        fim: diaLocal(h.ano, h.mes, 1),
        rotulo: `${nomeDoMes(mes)}/${ano}`,
      };
    }

    case "este_ano":
      return { inicio: diaLocal(h.ano, 1, 1), fim: diaLocal(h.ano + 1, 1, 1), rotulo: String(h.ano) };

    case "ano_anterior":
      return { inicio: diaLocal(h.ano - 1, 1, 1), fim: diaLocal(h.ano, 1, 1), rotulo: String(h.ano - 1) };

    case "personalizado":
    default:
      return { inicio: diaLocal(h.ano, h.mes, 1), fim: maisDias(h.ano, h.mes, h.dia, 1), rotulo: "Personalizado" };
  }
}

/** Intervalo a partir de duas datas escolhidas na tela. O fim inclui o dia. */
export function periodoPersonalizado(inicioISO: string, fimISO: string): Periodo {
  const [ai, mi, di] = inicioISO.split("-").map(Number);
  const [af, mf, df] = fimISO.split("-").map(Number);
  const fimBase = new Date(Date.UTC(af, mf - 1, df + 1));
  return {
    inicio: deSaoPauloParaUtc(ai, mi, di),
    fim: deSaoPauloParaUtc(fimBase.getUTCFullYear(), fimBase.getUTCMonth() + 1, fimBase.getUTCDate()),
    rotulo: `${di}/${mi}/${ai} a ${df}/${mf}/${af}`,
  };
}

/** `inicio <= momento < fim`. */
export function dentroDoPeriodo(momento: Date | string, periodo: Periodo): boolean {
  const t = typeof momento === "string" ? new Date(momento).getTime() : momento.getTime();
  return t >= periodo.inicio.getTime() && t < periodo.fim.getTime();
}

/** Data no formato brasileiro, sempre no fuso de São Paulo. */
export function formatarData(iso: string | null, comHora = false): string {
  if (!iso) return "Não identificada";
  const p = partesEmSaoPaulo(new Date(iso));
  const d = `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}/${p.ano}`;
  if (!comHora) return d;
  return `${d} ${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}
