import type { Demand } from "./types";

/**
 * QUANDO UMA DEMANDA CONCLUÍDA SAI DA LISTA DE QUEM PEDIU
 *
 * "Minhas Demandas" responde uma pergunta só: o que eu pedi e ainda não
 * chegou? Trabalho terminado não responde isso — mas também não pode sumir no
 * instante em que alguém marca como concluído, porque é justamente aí que a
 * pessoa quer conferir se resolveu mesmo, ou reclamar que não resolveu.
 *
 * Então existe uma janela: a demanda concluída fica visível por mais alguns
 * dias e depois sai sozinha. Quem precisar dela depois continua achando em
 * "Ver todas" e na busca — sair da lista não é ser apagada.
 *
 * POR QUE DIAS ÚTEIS, E NÃO CORRIDOS
 * Uma demanda concluída numa sexta à tarde, com cinco dias corridos,
 * sobreviveria só três dias de trabalho — e dois deles a pessoa nem abriu o
 * sistema. Com dias úteis, todo mundo recebe a mesma quantidade de
 * oportunidades reais de ver, independente do dia da semana em que o time
 * terminou.
 */

/** Dias ÚTEIS que uma demanda concluída permanece visível. */
export const DIAS_UTEIS_VISIVEL = 5;

/**
 * Conta dias úteis (segunda a sexta) entre duas datas.
 *
 * Feriado não entra na conta: exigiria um calendário nacional mais os
 * municipais, que mudam por cidade e por ano. O erro que isso introduz é de
 * um ou dois dias a MENOS de visibilidade num feriado — e errar para "ficou
 * visível menos tempo" é bem menos grave que o contrário.
 */
export function diasUteisEntre(de: Date, ate: Date): number {
  if (ate <= de) return 0;
  let dias = 0;
  const cursor = new Date(de);
  cursor.setHours(0, 0, 0, 0);
  const fim = new Date(ate);
  fim.setHours(0, 0, 0, 0);
  while (cursor < fim) {
    cursor.setDate(cursor.getDate() + 1);
    const diaDaSemana = cursor.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) dias += 1;
  }
  return dias;
}

/**
 * A demanda ainda pertence à lista de quem a abriu?
 *
 * Aberta: sempre sim. Concluída: só dentro da janela.
 *
 * A data usada é `updated_at`, porque `demands` não guarda "concluída em".
 * É uma aproximação honesta: a conclusão é, quase sempre, a última coisa que
 * acontece com a demanda. Se alguém comentar depois, o relógio reinicia e ela
 * fica visível mais tempo — o que é o erro certo a cometer, já que comentário
 * novo é justamente sinal de que o assunto não acabou.
 */
export function visivelParaOSolicitante(d: Demand, agora: Date = new Date()): boolean {
  if (d.status !== "concluido") return true;
  const referencia = new Date(d.updated_at);
  if (Number.isNaN(referencia.getTime())) return true;
  return diasUteisEntre(referencia, agora) < DIAS_UTEIS_VISIVEL;
}
