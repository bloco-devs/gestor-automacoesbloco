/**
 * Bounded context `demand` — barrel público.
 *
 * A UI importa daqui e de mais lugar nenhum. Ela não conhece `atividades_cards`
 * nem `demands`: conhece `Demanda`. Trocar a fonte é trocar qual mapper
 * alimenta a tela.
 */
export * from "./types";
export * from "./services/risco";
export * from "./services/DemandaQuery";
export * from "./services/novaDemanda";
export * from "./services/fio";
export * from "./services/briefing";
export * from "./services/progressao";
export * from "./services/anexos";
export * from "./services/conhecimento";
export { fromAtividades, CAPACIDADES_ATIVIDADES, type EntradaAtividades } from "./mappers/fromAtividades";
export { fromDemands, CAPACIDADES_DEMANDS, type EntradaDemands } from "./mappers/fromDemands";
export * from "./services/tomDaEtapa";
