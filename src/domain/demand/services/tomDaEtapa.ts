/**
 * O TOM DE UMA ETAPA
 *
 * Cor num board só ajuda se ela significar alguma coisa. Uma paleta sorteada
 * por posição — primeira coluna azul, segunda verde, terceira roxa — é
 * decoração: ela obriga a ler o rótulo de qualquer jeito, e ainda muda de
 * sentido quando alguém reordena as colunas. Pior: ensina que a cor não quer
 * dizer nada, e a partir daí o olho para de usá-la.
 *
 * Aqui o tom vem do SIGNIFICADO da etapa. Verde é sempre "terminou", vermelho
 * é sempre "travou", âmbar é sempre "alguém está com isso na mão". Quem olha
 * o board de longe consegue responder "há muito vermelho?" sem ler uma
 * palavra — que é a única coisa que cor faz melhor que texto.
 *
 * POR QUE POR NOME, E NÃO POR UM CAMPO NO BANCO
 * As colunas vêm de duas fontes: o import do Trello, onde o nome é livre e foi
 * digitado por uma pessoa, e o enum de status do Help Desk. Não existe hoje um
 * campo "tipo de etapa" em nenhuma das duas, e criar um exigiria migração mais
 * uma tela de configuração para preencher — para um ganho que o nome já
 * entrega em 95% dos casos.
 *
 * Quando o nome não casa com nada, o tom é neutro. Isso é de propósito: uma
 * etapa sem cor lê como "etapa comum", que é a verdade, em vez de receber um
 * palpite colorido que o olho vai interpretar como informação.
 */

export type TomDaEtapa = "neutro" | "andamento" | "revisao" | "concluido" | "bloqueado";

/** Tira acento e caixa: "Em Análise", "EM ANALISE" e "em análise" são a mesma etapa. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * A ordem importa: o primeiro tom cujo termo aparecer vence.
 *
 * "Aguardando aprovação" contém "aprova", mas quem está aguardando não
 * terminou. Por isso `bloqueado` e `revisao` são testados antes de
 * `concluido` — o estado mais restritivo ganha, e errar para "ainda não
 * acabou" é mais seguro que pintar de verde algo que está parado.
 */
const REGRAS: Array<{ tom: TomDaEtapa; termos: string[] }> = [
  {
    tom: "bloqueado",
    termos: [
      "bloquead", "impedid", "travad", "parad", "reprovad", "recusad",
      "rejeitad", "cancelad", "descartad", "arquivad",
    ],
  },
  {
    tom: "revisao",
    termos: [
      "revis", "valida", "verifica", "teste", "qa", "homologa", "aguardando",
      "espera", "pendente", "analise", "triagem", "documento", "code review",
    ],
  },
  {
    tom: "concluido",
    termos: [
      "conclu", "finaliz", "entregue", "pronto", "feito", "done", "encerrad",
      "aprova", "publicad", "resolvid",
    ],
  },
  {
    tom: "andamento",
    termos: [
      "andamento", "execu", "desenvolv", "fazendo", "doing", "progress",
      "trabalhando", "curso", "atendimento", "implementa",
    ],
  },
];

export function tomDaEtapa(rotulo: string): TomDaEtapa {
  const n = normalizar(rotulo);
  if (!n) return "neutro";
  for (const { tom, termos } of REGRAS) {
    if (termos.some((t) => n.includes(t))) return tom;
  }
  return "neutro";
}
