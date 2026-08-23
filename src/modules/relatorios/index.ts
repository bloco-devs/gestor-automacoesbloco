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
