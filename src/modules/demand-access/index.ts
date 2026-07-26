/**
 * Camada de acesso a demandas — barrel público.
 *
 * A UI importa daqui. Acima desta linha ninguém conhece `atividades_cards`,
 * `demands`, `useAtividadesBoard` ou `useDemands`.
 */
export { useDemandas, useDemanda } from "./useDemandas";
export { useAcoesDemanda } from "./useAcoesDemanda";
export { resolverFonte, projetoDoEscopo } from "./resolverFonte";
export type { Escopo, EstadoDemandas, AcoesDemanda, ProjetoAtual } from "./types";
