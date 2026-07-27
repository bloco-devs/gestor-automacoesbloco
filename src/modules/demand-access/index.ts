/**
 * Camada de acesso a demandas — barrel público.
 *
 * A UI importa daqui. Acima desta linha ninguém conhece `atividades_cards`,
 * `demands`, `useAtividadesBoard` ou `useDemands`.
 */
export { useDemandas, useDemanda } from "./useDemandas";
export { useTodasAsDemandas, type EstadoTodasAsDemandas } from "./useTodasAsDemandas";
export { useAcoesDemanda } from "./useAcoesDemanda";
export { resolverFonte, projetoDoEscopo } from "./resolverFonte";
export { useProjetos } from "./useProjetos";
export { useCriarDemanda } from "./useCriarDemanda";
export { useFioDaDemanda } from "./useFioDaDemanda";
export { useChecklist, type ItemDaLista } from "./useChecklist";
export { useAnexos, type AnexoExibivel } from "./useAnexos";
export { useConhecimento } from "./useConhecimento";
export { usePublicarArtigo } from "./usePublicarArtigo";
export type { Escopo, EstadoDemandas, AcoesDemanda, ProjetoAtual, EtapaDaFonte } from "./types";
export type { ProjetoNaLista } from "./useProjetos";
