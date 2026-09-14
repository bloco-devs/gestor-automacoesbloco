/**
 * ONDE ENTRA A DEMANDA QUE NÃO É DE NENHUM SISTEMA DA BLOCO
 *
 * O Gestor sabia receber demanda de sistema. Só disso. A primeira pergunta do
 * Blink é "em qual sistema?", a triagem obriga `sistema_alvo_slug` a ser um
 * slug exato do catálogo do HUB, e quem não é de sistema nenhum cai em `null`.
 *
 * `null` não é uma gaveta — é a ausência de uma. E a ausência não fica
 * vazia: o código do chamado passa a ser adivinhado pelas palavras do título.
 * O caso real que originou este arquivo, medido:
 *
 *   "Solicitada a tabela nova de leads do site, que sejam da campanha de
 *    google e site direto"
 *
 *   sistema_slug : (nulo)
 *   exibido      : CAP-2609-0012   <- código da Gestão de Captação
 *   sistema      : "não identificado"
 *
 * A palavra "leads" está na lista da Captação, então uma demanda de n8n
 * apareceu com o código de um sistema que não tem nada com ela — e, na mesma
 * tela, sem sistema identificado. Duas afirmações contraditórias sobre o mesmo
 * chamado.
 *
 * POR QUE ISTO NÃO VAI PARA O HUB
 *
 * A lista de sistemas que o Blink recebe vem do HUB, pela `ecossistema-mapa`,
 * e é a MESMA lista que desenha o Escritório. Cadastrar "Tecnologia" lá para
 * resolver isto daria a ela mesa, monitor, porta e estado de saúde no andar —
 * o andar afirmaria um sistema que não existe, que é exatamente o que ele
 * existe para não fazer.
 *
 * Então o destino vive AQUI, no Gestor, e é juntado ao catálogo do HUB só
 * onde se decide para onde vai uma demanda. Em lugar nenhum mais.
 *
 * UMA GAVETA, NÃO QUATRO
 *
 * A escolha foi deliberada: n8n, site, rede, planilha e integração externa
 * entram todos em "Tecnologia". Quatro gavetas dariam relatório mais fino e
 * uma pergunta a mais para todo mundo responder — e a própria demanda acima
 * já ficaria ambígua entre "site" e "dados". A descrição continua dizendo o
 * que é; se algum assunto virar volume, a área dele nasce com dado para
 * justificar, em vez de palpite agora.
 */

export interface DestinoForaDoEcossistema {
  /** Vai para `demands.sistema_slug`, como qualquer slug de sistema. */
  slug: string;
  /** Prefixo do código do chamado: `TEC-2609-0012`. */
  sigla: string;
  /** O nome que aparece na tela e no relatório. Nunca o slug. */
  nome: string;
}

/**
 * Tecnologia: o trabalho do time que não acontece dentro de um sistema da
 * Bloco. Automação em n8n, o site e suas campanhas, integração com terceiro,
 * rede, planilha, carga de dados.
 *
 * NÃO é "não sei de onde é" — para isso continua existindo o `REQ`, e a
 * diferença entre as duas coisas é a mesma que o Escritório já faz entre "sem
 * execução" e "sem dados". Uma é uma resposta; a outra é a falta dela.
 */
export const TECNOLOGIA: DestinoForaDoEcossistema = {
  slug: "tecnologia",
  sigla: "TEC",
  nome: "Tecnologia",
};

export const DESTINOS_FORA_DO_ECOSSISTEMA: DestinoForaDoEcossistema[] = [TECNOLOGIA];

/** Os slugs que NÃO vêm do HUB. Serve para as telas do ecossistema os ignorarem. */
export const SLUGS_FORA_DO_ECOSSISTEMA = new Set(
  DESTINOS_FORA_DO_ECOSSISTEMA.map((d) => d.slug),
);

/**
 * Junta o catálogo do HUB com os destinos locais, para o seletor e para a IA.
 *
 * Os destinos vão no FIM de propósito: a lista é lida por pessoa e por modelo,
 * e nos dois casos o que vem primeiro pesa mais. Sistema de verdade primeiro;
 * a gaveta do resto por último, que é onde ela deve ser considerada.
 */
export function comDestinosFora<T extends { id: string; nome: string; grupo?: string | null }>(
  sistemasDoHub: T[],
): Array<T | { id: string; nome: string; grupo: string | null }> {
  const jaTem = new Set(sistemasDoHub.map((s) => s.id));
  return [
    ...sistemasDoHub,
    ...DESTINOS_FORA_DO_ECOSSISTEMA.filter((d) => !jaTem.has(d.slug)).map((d) => ({
      id: d.slug,
      nome: d.nome,
      grupo: null,
    })),
  ];
}
