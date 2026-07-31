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

/** Identidade do recorte aberto. `null` quando o escopo é a fila global. */
export interface ProjetoAtual {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  /** Emoji escolhido na criação. Ocupa o quadradinho do cabeçalho quando não há capa. */
  icone?: string | null;
  capaUrl: string | null;
  /**
   * Imagem de fundo do quadro, já pronta para renderizar (URL, não caminho de
   * bucket). É a escolha feita na criação do quadro; `null` quando não há.
   */
  fundoUrl: string | null;
}

/** Uma etapa do caminho da demanda, na ordem em que a fonte a define. */
export interface EtapaDaFonte {
  id: string;
  rotulo: string;
}

export interface EstadoDemandas {
  demandas: Demanda[];
  /**
   * O caminho completo, incluindo etapas onde não há nenhuma demanda agora.
   *
   * Precisa vir daqui e não da lista visível: derivar as etapas das demandas
   * carregadas faria "Em Testes" desaparecer da linha do tempo sempre que
   * ninguém estivesse em testes — e some justamente a informação de que aquela
   * etapa foi pulada.
   */
  etapas: EtapaDaFonte[];
  /**
   * O projeto aberto. Fica aqui, e não na UI, porque descobrir o nome exige
   * saber de qual fonte ele vem — exatamente o que a UI não pode saber.
   */
  projeto: ProjetoAtual | null;
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
  /**
   * Marca como concluída.
   *
   * Não é `mover({ statusId: "concluido" })`: no quadro, "concluido" não é
   * o id de nenhuma coluna real — cada quadro tem as suas, com ids próprios
   * — então mover tentaria trocar para uma coluna que não existe. Concluir
   * é independente da coluna: `atividades_cards.concluido` é um booleano à
   * parte (`categorizarColuna` já leva isso em conta ao decidir a categoria
   * do status). Em `demands`, "concluido" é mesmo um status válido do enum.
   */
  concluir: (params: { demandaId: string }) => Promise<void>;
  podeMover: boolean;
  podeAtribuir: boolean;
  executando: boolean;
}

/**
 * A Inbox — onde a demanda nasce antes de pertencer a um projeto.
 *
 * O fluxo é: Assistente → Inbox → Triagem → Projeto → Desenvolvimento.
 * Quem relata um problema não sabe (nem deveria saber) em que projeto ele
 * cai; classificar é trabalho de quem recebe. Até isso acontecer, a demanda
 * precisa de um lugar visível — senão ela existe no banco e não existe na
 * tela, que foi exatamente o que aconteceu.
 *
 * O id é uma palavra reservada, não um uuid: a Inbox não é um projeto, é a
 * ausência de um. Reservar a palavra evita que um projeto de verdade chamado
 * "inbox" colida com a rota (nenhum board tem id textual).
 *
 * NÃO CONFUNDIR com o "Inbox" que saiu do menu — aquele era a central do
 * fluxo antigo de Solicitações, que não existe mais.
 */
export const INBOX_ID = "inbox";

export function ehInbox(projetoId: string | null | undefined): boolean {
  return projetoId === INBOX_ID;
}
