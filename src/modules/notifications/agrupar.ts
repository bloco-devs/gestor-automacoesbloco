import type { AppNotification } from "./service";

/**
 * QUANDO CINCO AVISOS SÃO UM AVISO SÓ
 *
 * Mover um cartão por cinco colunas numa tarde gera cinco notificações de
 * mudança de status, todas apontando para a mesma demanda. Cada uma delas
 * está correta. O conjunto é que mente: o sino marca 5, a pessoa abre
 * esperando cinco assuntos e encontra um.
 *
 * O gatilho no banco não tem culpa — ele já se protege com `IS DISTINCT
 * FROM` e só dispara em mudança real. Não há evento duplicado para remover.
 * O que falta é alguém, do lado de cá, reconhecer que aquilo é uma história
 * só sendo contada em capítulos.
 *
 * POR QUE O GRUPO NÃO ABRE
 *
 * A tentação óbvia é fazer o grupo expandir e mostrar as cinco linhas. Mas o
 * histórico completo já existe, e existe num lugar melhor: o fio da demanda,
 * onde cada mudança aparece em ordem, com autor e horário, ao lado das
 * conversas que a explicam. Reproduzir isso dentro de um popover de 384px
 * seria oferecer uma versão pior do que está a um clique de distância.
 *
 * O sino responde "o que precisa de mim agora". O fio responde "o que
 * aconteceu". São perguntas diferentes, e é bom que tenham lugares
 * diferentes.
 */

export interface GrupoDeNotificacoes {
  /** O id do representante — serve de chave de lista. */
  id: string;
  /** A mais recente do grupo: é o estado atual, e é o que a pessoa quer ler. */
  representante: AppNotification;
  /** Todas as notificações do grupo, para ler ou apagar em bloco. */
  ids: string[];
  quantidade: number;
  naoLidas: number;
  /**
   * Horário da mais ANTIGA já absorvida. Só serve para medir a janela ao
   * encadear — a linha na tela mostra o horário do representante.
   */
  ultimaEm: string;
}

/**
 * Duas notificações vizinhas só se juntam se estiverem dentro desta janela.
 *
 * Sem limite, um aviso de um mês atrás grudaria no de hoje sempre que nada
 * tivesse acontecido no meio — e o grupo exibiria a data de hoje, escondendo
 * que um dos itens é antigo. A janela existe para que "grupo" signifique
 * "mesma sequência de trabalho", que é o caso que incomoda.
 */
const JANELA_MS = 6 * 60 * 60 * 1000;

/**
 * Agrupa apenas notificações ADJACENTES.
 *
 * Juntar itens distantes na lista obrigaria a puxar o mais antigo para cima
 * ou empurrar o mais novo para baixo — nos dois casos a ordem cronológica se
 * quebra, e uma lista de avisos que não respeita o tempo perde a única
 * garantia que ela tem. Agrupando só o que já está lado a lado, a sequência
 * continua exatamente a mesma; grupos apenas ocupam menos linhas.
 *
 * Espera a lista já ordenada da mais recente para a mais antiga.
 */
export function agruparNotificacoes(lista: AppNotification[]): GrupoDeNotificacoes[] {
  const grupos: GrupoDeNotificacoes[] = [];

  for (const n of lista) {
    const anterior = grupos[grupos.length - 1];

    if (anterior && podemSeJuntar(anterior, n)) {
      anterior.ids.push(n.id);
      anterior.quantidade += 1;
      if (!n.read) anterior.naoLidas += 1;
      anterior.ultimaEm = n.created_at;
      continue;
    }

    grupos.push({
      id: n.id,
      representante: n,
      ids: [n.id],
      quantidade: 1,
      naoLidas: n.read ? 0 : 1,
      ultimaEm: n.created_at,
    });
  }

  return grupos;
}

/**
 * A janela é medida contra a ÚLTIMA notificação absorvida, não contra o
 * representante. Cinco mudanças espaçadas de duas horas formam uma sequência
 * contínua de trabalho, e é assim que a pessoa a viveu; medir sempre a partir
 * do topo cortaria o grupo na quarta por um limite que ninguém sentiu passar.
 */
function podemSeJuntar(grupo: GrupoDeNotificacoes, candidata: AppNotification): boolean {
  const referencia = grupo.representante;

  // Sem destino não há como afirmar que falam do mesmo assunto. Avisos de
  // sistema soltos ficam cada um na sua linha — é o comportamento seguro.
  if (!referencia.link_url || !candidata.link_url) return false;
  if (referencia.link_url !== candidata.link_url) return false;

  // Mesmo assunto, naturezas diferentes: "atribuíram a você" e "mudou de
  // status" são fatos distintos sobre a mesma demanda, e juntá-los faria o
  // grupo exibir um título que não cobre o outro.
  if (referencia.type !== candidata.type) return false;

  const distancia = Math.abs(
    new Date(grupo.ultimaEm).getTime() - new Date(candidata.created_at).getTime(),
  );
  return distancia <= JANELA_MS;
}
