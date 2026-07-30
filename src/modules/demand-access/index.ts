/**
 * Camada de acesso a demandas — barrel público.
 *
 * A UI importa daqui. Acima desta linha ninguém conhece `atividades_cards`,
 * `demands`, `useAtividadesBoard` ou `useDemands`.
 */
export { useDemandas, useDemanda } from "./useDemandas";
export { useTodasAsDemandas, type EstadoTodasAsDemandas } from "./useTodasAsDemandas";
export { useAcoesDemanda } from "./useAcoesDemanda";
export { useAssumirDemanda, type AssumirDemanda } from "./useAssumirDemanda";
export { useMoverDemanda, type MoverDemanda } from "./useMoverDemanda";
export { resolverFonte, projetoDoEscopo } from "./resolverFonte";
export { useProjetos } from "./useProjetos";
export { useCriarDemanda } from "./useCriarDemanda";
export { useCriarProjeto, type IdentidadeDoProjeto } from "./useCriarProjeto";
export { useExcluirProjeto } from "./useExcluirProjeto";
export { useCriarCartao } from "./useCriarCartao";

export { useFioDaDemanda } from "./useFioDaDemanda";
export { useChecklist, type ItemDaLista } from "./useChecklist";
export { useAnexos, type AnexoExibivel } from "./useAnexos";
export { useConhecimento } from "./useConhecimento";
export { usePublicarArtigo } from "./usePublicarArtigo";
export type { Escopo, EstadoDemandas, AcoesDemanda, ProjetoAtual, EtapaDaFonte } from "./types";
export { INBOX_ID, ehInbox } from "./types";
export type { ProjetoNaLista } from "./useProjetos";
