/**
 * OS DOIS CATÁLOGOS DE SISTEMA, E A PONTE QUE FALTAVA
 *
 * O sistema tem duas listas de sistemas, e elas nunca conversaram:
 *
 *   ECOSSISTEMA  vem do HUB Bloco ID, identificado por SLUG ("processos").
 *                É o que a IA recebe e o que ela devolve.
 *   `solucoes`   tabela local, identificada por UUID. É para onde
 *                `demands.system_id` aponta.
 *
 * Sem ponte entre as duas, `system_id` ficava sempre nulo — e isso tinha um
 * efeito que só apareceu agora: a função `demand_prefixo` do banco monta o
 * código do chamado a partir do SISTEMA. Sem sistema, ela devolve `REQ`.
 *
 * Ou seja, `REQ-2607-0004` era literalmente o banco dizendo "não sei de que
 * sistema é isso". Todo chamado nascia assim, mesmo quando a IA tinha
 * acertado o sistema — porque o acerto nunca era gravado.
 *
 * A ponte possível é o NOME, já que não há campo em comum. É aproximada, e
 * por isso a regra é conservadora: na dúvida, devolve null. Um `REQ` é
 * honesto; um `RH` numa demanda de obra é pior que não classificar.
 */

/** Tira acento, caixa e pontuação: "Gestão de Processo / SGPO" e "gestao processo sgpo". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Comprimento mínimo para aceitar um casamento por continência.
 *
 * Sem esse piso, "RH" casaria dentro de qualquer palavra que contivesse
 * essas duas letras, e "TI" seria ainda pior. Quatro caracteres é o ponto em
 * que uma coincidência deixa de ser plausível.
 */
const MINIMO_PARA_CONTINENCIA = 4;

export interface SistemaDoCatalogo {
  id: string;
  nome: string;
}

/**
 * Acha o UUID em `solucoes` que corresponde ao nome vindo do ecossistema.
 *
 * A ordem das tentativas vai da mais segura para a menos:
 *   1. Nome idêntico depois de normalizado.
 *   2. Um contém o outro — cobre "SGPO" dentro de "Gestão de Processo / SGPO".
 * Nada mais. Similaridade por letras soltas geraria falso positivo, e um
 * falso positivo aqui manda a demanda para a fila errada.
 */
export function casarSistema(
  nomeDoEcossistema: string | null | undefined,
  catalogo: SistemaDoCatalogo[],
): string | null {
  if (!nomeDoEcossistema) return null;
  const alvo = normalizar(nomeDoEcossistema);
  if (!alvo) return null;

  const exato = catalogo.find((s) => normalizar(s.nome) === alvo);
  if (exato) return exato.id;

  if (alvo.length >= MINIMO_PARA_CONTINENCIA) {
    const contido = catalogo.find((s) => {
      const n = normalizar(s.nome);
      if (n.length < MINIMO_PARA_CONTINENCIA) return false;
      return n.includes(alvo) || alvo.includes(n);
    });
    if (contido) return contido.id;
  }

  return null;
}
