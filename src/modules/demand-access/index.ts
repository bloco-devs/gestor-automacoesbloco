/**
 * Camada de acesso a demandas — barrel público.
 *
 * A UI importa daqui. Acima desta linha ninguém conhece `atividades_cards`,
 * `demands`, `useAtividadesBoard` ou `useDemands`.
 */
export { useDemandas, useDemanda } from "./useDemandas";
export { useAcoesDemanda } from "./useAcoesDemanda";
export { resolverFonte, projetoDoEscopo } from "./resolverFonte";
export { useProjetos } from "./useProjetos";
export { useCriarDemanda } from "./useCriarDemanda";
export type { Escopo, EstadoDemandas, AcoesDemanda, ProjetoAtual } from "./types";
export type { ProjetoNaLista } from "./useProjetos";
