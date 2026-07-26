import type { Capacidades, Demanda, FonteId } from "@/domain/demand";

/**
 * Camada de acesso a demandas — a fronteira entre a UI e as tabelas.
 *
 * O domínio (`src/domain/demand`) é puro: não pode importar React. Esta camada
 * é a contraparte com React: liga os hooks que já existem aos mappers do
 * domínio e devolve `Demanda[]`.
 *
 * REGRA QUE ESTA CAMADA EXISTE PARA GARANTIR
 * Nenhum componente de UI acima daqui importa `useAtividadesBoard`,
 * `useDemands`, `AtividadeCard` ou `Demand`. A UI recebe `Demanda[]` e
 * `Capacidades`, e mais nada. Abandonar `atividades_cards` amanhã é editar
 * `resolverFonte.ts` — nenhuma tela muda.
 */

/**
 * O recorte de demandas que se quer ver.
 *
 * `projeto` é hoje um quadro; quando `demands` ganhar agrupamento por projeto,
 * o mesmo escopo passa a valer para os dois sem a UI perceber.
 */
export type Escopo =
  | { tipo: "projeto"; projetoId: string }
  | { tipo: "global" }
  | { tipo: "demanda"; demandaId: string; projetoId?: string };

export interface EstadoDemandas {
  demandas: Demanda[];
  /** O que a fonte ativa sabe responder. A UI usa isto para não desenhar coluna vazia. */
  capacidades: Capacidades;
  fonte: FonteId;
  carregando: boolean;
  erro: Error | null;
}

/**
 * O que se pode fazer com uma demanda, independente de onde ela mora.
 *
 * Cada ação tem um `pode*` correspondente porque nem toda fonte suporta tudo —
 * e um botão que existe mas falha é pior que um botão que não existe.
 */
export interface AcoesDemanda {
  /** Move para outro status. No quadro é trocar de coluna; em `demands`, trocar o enum. */
  mover: (params: { demandaId: string; statusId: string; ordem?: number }) => Promise<void>;
  atribuir: (params: { demandaId: string; pessoaId: string | null }) => Promise<void>;
  podeMover: boolean;
  podeAtribuir: boolean;
  executando: boolean;
}
