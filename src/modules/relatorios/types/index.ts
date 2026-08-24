/**
 * Tipos do módulo de Relatórios e Remuneração Variável.
 *
 * Duas coisas convivem aqui e NÃO se misturam:
 *
 *   HISTÓRICO TÉCNICO — períodos cronológicos normais (dia, semana, mês
 *   inteiro, ano). Mostra tudo que foi feito, sem recorte de pagamento.
 *
 *   APURAÇÃO DA FOLHA — a janela configurada no ciclo, seja ela qual for. Só
 *   o que é elegível, com data confirmada e classificação definida por gente.
 *
 * O corte da apuração não é fim do histórico: uma entrega fora do ciclo
 * continua existindo no relatório técnico, só não gera ponto naquele ciclo.
 *
 * E o corte NÃO é uma regra fixa do sistema. O ciclo de setembro/2026 vai de
 * 20/08 a 19/09 porque a folha de agosto já estava fechada quando o programa
 * começou — decisão administrativa do RH, gravada em `relatorio_ciclo`, e
 * alterável pela tela de Gestão de Ciclos sem tocar em código.
 */

/** Fuso de todos os cortes de data. Nunca usar offset fixo. */
export const FUSO = "America/Sao_Paulo";

// ---------------------------------------------------------------------------
// Classificação e pontos
// ---------------------------------------------------------------------------

/** Vem de `relatorio_classificacao_tipo`. Os pontos são DADO, não constante. */
export interface TipoDeClassificacao {
  codigo: string;
  rotulo: string;
  pontos: number;
  ordem: number;
  ativo: boolean;
}

/**
 * Uma atividade ainda pode não ter classificação — e isso é um estado
 * legítimo, não um erro. Sem classificação humana, não entra na apuração.
 */
export type SituacaoDaClassificacao = "pendente" | "definida";

// ---------------------------------------------------------------------------
// Data de conclusão
// ---------------------------------------------------------------------------

/**
 * De onde a data veio. Data sem procedência é indistinguível de chute, e
 * este número decide se alguém recebe.
 */
export type Procedencia = "confirmada" | "inferida" | "nao_identificada";

export interface DataDeConclusao {
  data: string | null;
  procedencia: Procedencia;
  evidencia: string | null;
}

// ---------------------------------------------------------------------------
// Ciclo de apuração
// ---------------------------------------------------------------------------

export type SituacaoDoCiclo = "aberto" | "em_analise" | "fechado" | "aprovado";

/**
 * A janela vem do banco pronta, em ISO. Não é recalculada aqui — se o RH
 * mudar o corte, muda a linha, e o frontend obedece.
 */
export interface Ciclo {
  id: string;
  rotulo: string;
  referencia: string;
  inicio: string;
  fim: string;
  metaPontos: number;
  situacao: SituacaoDoCiclo;
}

// ---------------------------------------------------------------------------
// Faixas de alcance
// ---------------------------------------------------------------------------

/**
 * `valorReais: null` NÃO é zero. É "o RH ainda não definiu quanto vale".
 * A diferença entre os dois é a diferença entre informar e inventar.
 */
export interface Faixa {
  id: string;
  rotulo: string | null;
  percentualMin: number;
  percentualMax: number | null;
  valorReais: number | null;
}

/** O que a tela precisa saber para não inventar valor. */
export interface ResultadoDaFaixa {
  faixa: Faixa | null;
  valorReais: number | null;
  /** true quando existe faixa mas sem valor, OU quando não existe faixa. */
  indefinida: boolean;
  mensagem: string;
}

// ---------------------------------------------------------------------------
// Períodos do relatório técnico
// ---------------------------------------------------------------------------

export type AtalhoDePeriodo =
  | "hoje"
  | "ontem"
  | "ultimos7"
  | "esta_semana"
  | "semana_anterior"
  | "este_mes"
  | "mes_anterior"
  | "este_ano"
  | "ano_anterior"
  | "personalizado";

/** Semiaberto, sempre: `inicio <= x < fim`. */
export interface Periodo {
  inicio: Date;
  fim: Date;
  rotulo: string;
}
