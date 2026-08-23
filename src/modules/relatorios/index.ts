// Pontos de entrada públicos do módulo de Relatórios.
// Barril explícito, no padrão de `src/modules/analytics/index.ts`.

export { default as RelatoriosHub } from "./components/RelatoriosHub";
export { default as RelatorioImplementacoes } from "./components/RelatorioImplementacoes";

export { useRelatorioImplementacoes } from "./hooks/useRelatorioImplementacoes";

export {
  buscarCiclos,
  buscarFaixas,
  buscarImplementacoes,
  buscarMinhasCapacidades,
  buscarTiposDeClassificacao,
} from "./services/relatorios-data";

export {
  cicloDe,
  contarPorClassificacao,
  dentroDoCiclo,
  dentroDoPeriodo,
  formatarData,
  janelaDoCiclo,
  percentualDeAlcance,
  periodoDoAtalho,
  periodoPersonalizado,
  pontosDe,
  resolverFaixa,
  somarPontos,
} from "./services/relatorios-service";

export type {
  AtalhoDePeriodo,
  Ciclo,
  DataDeConclusao,
  Faixa,
  Periodo,
  Procedencia,
  ResultadoDaFaixa,
  TipoDeClassificacao,
} from "./types";

// Etapa 3 — fechamento técnico, tempo e classificação
export { default as PendenciasDeFechamento } from "./components/PendenciasDeFechamento";
export { default as FechamentoTecnico } from "./components/FechamentoTecnico";

export {
  adicionarIntervalo,
  buscarFechamento,
  buscarIntervalos,
  buscarParaClassificar,
  buscarPendencias,
  classificar,
  formatarDuracao,
  removerIntervalo,
  salvarFechamento,
  somarMinutos,
} from "./services/fechamento-data";

export type {
  FechamentoTecnico as DadosDoFechamento,
  Intervalo,
  ParaClassificar,
  Pendencia,
} from "./services/fechamento-data";

// Etapa 4
export { default as Classificacao } from "./components/Classificacao";
export { buscarApuracao } from "./services/relatorios-data";
export type { LinhaDaApuracao } from "./services/relatorios-data";

// Etapa 5 — apuração do ciclo
export { default as Apuracao } from "./components/Apuracao";
export {
  buscarPendenciasDoCiclo,
  buscarResultadoDoCiclo,
  fecharCiclo,
  formatarPercentual,
  formatarReais,
  reabrirCiclo,
} from "./services/apuracao-data";
export type { PendenciasDoCiclo, ResultadoDoCiclo } from "./services/apuracao-data";
export { default as MedidorDaMeta } from "./components/MedidorDaMeta";
