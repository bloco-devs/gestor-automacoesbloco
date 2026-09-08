/**
 * O terceiro eixo do Escritório: tem gente aí?
 *
 * O andar já respondia duas perguntas, e cada uma tem o seu elemento:
 *
 *   BLINK    o HUB tem registro deste sistema?
 *   monitor  houve execução de integração na janela de 30 dias?
 *
 * Nenhuma das duas responde "tem gente trabalhando nesta sala", e a diferença
 * não é acadêmica. Medido no HUB em 08/09/2026:
 *
 *   processos    9 pessoas nas últimas 24 h   ZERO execução  → a tela dizia "sem execução"
 *   portfolio    0 pessoas                    17 execuções   → a tela dizia "trabalhando"
 *
 * Os dois sinais são quase opostos. Uma sala com nove pessoas dentro aparecia
 * com o monitor apagado, e a única acesa não tinha ninguém desde o dia
 * anterior. Este arquivo existe para o terceiro sinal não se confundir com os
 * outros dois.
 *
 * O QUE ELE NÃO É
 *
 * `pessoas_24h` conta LOGIN por SSO na janela, não trabalho efetivo. A pessoa
 * pode entrar e sair. Por isso todo rótulo derivado daqui diz "acessaram", e
 * nunca "trabalhando" — escrever a segunda palavra sobre a primeira seria a
 * mesma troca que já nos custou uma correção quando `execs` virou "sem
 * execução em 30 dias" e o André leu "abandonado".
 */

import type { UsoSistema } from "./dados";

/** Quantas pessoas entraram na janela de 24 h. Zero quando não se sabe. */
export function pessoasAgora(uso: UsoSistema | undefined): number {
  const n = uso?.pessoas_24h ?? 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Existe sinal de uso para este nó?
 *
 * Diferente de `pessoasAgora() > 0`: um sistema pode ter registro de acesso
 * com zero pessoas nas últimas 24 h — o que é informação ("ninguém entrou
 * hoje"), não ausência dela. Conectores externos nunca têm: quem acessa
 * sistema é pessoa, e serviço de fora não tem quem entre nele.
 */
export function temSinalDeUso(uso: UsoSistema | undefined): boolean {
  return uso !== undefined;
}

export interface ResumoDeUso {
  /** Salas com pelo menos uma pessoa nas últimas 24 h. */
  salasComGente: number;
  /** Soma das pessoas — pode contar a mesma pessoa em duas salas. */
  pessoas: number;
}

/**
 * O resumo do rodapé.
 *
 * `pessoas` soma por sala, então quem entrou em dois sistemas conta duas
 * vezes. Está certo para a pergunta que o rodapé faz ("quanta gente circulando
 * pelo andar"), e é por isso que o rótulo fala de SALAS, não de pessoas
 * distintas — o HUB entrega agregado por sistema e não há como deduplicar
 * pessoa daqui sem inventar.
 */
export function resumoDeUso(
  nos: { id: string }[],
  uso: Record<string, UsoSistema | undefined>,
): ResumoDeUso {
  let salasComGente = 0;
  let pessoas = 0;
  for (const no of nos) {
    const n = pessoasAgora(uso[no.id]);
    if (n > 0) salasComGente++;
    pessoas += n;
  }
  return { salasComGente, pessoas };
}

/**
 * O texto da prévia. Uma frase, e ela precisa dizer o que a métrica é.
 *
 * Não recebe `Date.now()` por dentro: a data entra como parâmetro para o teste
 * poder fixá-la, e porque função que lê o relógio escondido é função que não
 * se testa.
 */
export function fraseDeUso(uso: UsoSistema | undefined, agora = Date.now()): string | null {
  if (!uso) return null;
  const n = pessoasAgora(uso);
  const quando = uso.ultimo_login ? Date.parse(uso.ultimo_login) : Number.NaN;
  const horas = Number.isNaN(quando) ? null : Math.floor((agora - quando) / 3_600_000);

  if (n === 0) {
    if (horas === null) return "Ninguém acessou este sistema nas últimas 24 horas.";
    const dias = Math.floor(horas / 24);
    const desde =
      horas < 48 ? "ontem" : dias < 30 ? `há ${dias} dias` : "há mais de um mês";
    return `Ninguém acessou nas últimas 24 horas. A última entrada foi ${desde}.`;
  }

  const pessoas = n === 1 ? "1 pessoa acessou" : `${n} pessoas acessaram`;
  if (horas === null) return `${pessoas} nas últimas 24 horas.`;
  const entrada =
    horas < 1 ? "há menos de uma hora" : horas === 1 ? "há 1 hora" : `há ${horas} horas`;
  return `${pessoas} nas últimas 24 horas. A última entrada foi ${entrada}.`;
}
