import type { Evento } from "./fio";

/**
 * QUANDO O HISTORICO AFOGA A CONVERSA
 *
 * Arrastar um cartao por seis colunas numa tarde produz seis linhas de "moveu
 * para X" no fio. Cada uma esta correta e nenhuma esta errada — o problema e o
 * conjunto: seis linhas administrativas seguidas empurram a ultima fala humana
 * para fora da tela, e quem abre a demanda encontra um log de auditoria onde
 * deveria encontrar uma conversa.
 *
 * O fio existe para responder "o que foi combinado aqui". Movimento de coluna
 * responde outra pergunta — "por onde isso passou" — que importa, mas nao no
 * mesmo peso, e quase nunca uma por uma.
 *
 * A DOBRA MOSTRA O ESTADO ATUAL, NAO O PRIMEIRO
 * O representante e o evento MAIS RECENTE da sequencia. Se alguem moveu para
 * Testes, voltou para Backlog e terminou em Concluido, o que a pessoa precisa
 * ler e "Concluido" — os passos intermediarios sao o caminho, e caminho se
 * consulta quando se quer, nao se le sem pedir.
 *
 * POR QUE AQUI ELA ABRE, E NO SINO NAO
 * No sino, agrupar e esconder: o detalhe vive no fio, a um clique. No fio nao
 * ha para onde mandar ninguem — ele E o lugar do detalhe. Entao a dobra abre
 * no proprio lugar, e o que estava dobrado volta na ordem original.
 */

export type ItemDoFio =
  | { tipo: "evento"; evento: Evento }
  | { tipo: "dobra"; id: string; eventos: Evento[] };

/**
 * A partir de quantas mudancas seguidas vale dobrar.
 *
 * Duas linhas nao atrapalham ninguem, e dobra-las cobraria um clique para
 * revelar o que ja cabia na tela — troca ruim. Tres e onde a sequencia comeca
 * a parecer um bloco em vez de eventos soltos.
 */
const MINIMO_PARA_DOBRAR = 3;

export function dobrarMudancas(eventos: Evento[]): ItemDoFio[] {
  const itens: ItemDoFio[] = [];
  let corrida: Evento[] = [];

  const fechar = () => {
    if (corrida.length === 0) return;
    if (corrida.length >= MINIMO_PARA_DOBRAR) {
      itens.push({ tipo: "dobra", id: `dobra-${corrida[0].id}`, eventos: corrida });
    } else {
      for (const e of corrida) itens.push({ tipo: "evento", evento: e });
    }
    corrida = [];
  };

  for (const e of eventos) {
    if (e.tipo === "mudanca") {
      corrida.push(e);
      continue;
    }
    fechar();
    itens.push({ tipo: "evento", evento: e });
  }
  fechar();

  return itens;
}

/** O estado atual da sequencia: o ultimo evento e o que vale. */
export function representanteDaDobra(eventos: Evento[]): Evento {
  return eventos[eventos.length - 1];
}
