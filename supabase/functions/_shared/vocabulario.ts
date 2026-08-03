/**
 * O QUE CADA SISTEMA FAZ, E AS PALAVRAS QUE PERTENCEM A ELE
 *
 * O catálogo do ecossistema entrega nome e grupo. Isso basta para o Blink
 * LISTAR sistemas e não basta para ele RECONHECER de qual a pessoa está
 * falando.
 *
 * O caso que revelou isso: "não consigo criar um ritual". Ritual é vocabulário
 * do SGPO — quem trabalha com processos sabe disso de cor. Para o modelo era
 * uma palavra solta, e ele chutou outro sistema. Não é falta de inteligência:
 * é falta de informação que nunca saiu da cabeça de quem usa.
 *
 * POR QUE VOCABULÁRIO, E NÃO DESCRIÇÃO
 * "Sistema de gestão de processos da empresa" é uma frase institucional e não
 * ajuda em nada: ninguém abre demanda dizendo "tenho um problema na gestão de
 * processos". As pessoas dizem "ritual", "POP", "cadeia de valor". São essas
 * palavras que precisam estar aqui.
 *
 * ATENÇÃO — ESTE ARQUIVO PRECISA DE REVISÃO HUMANA
 * O conteúdo abaixo é um rascunho feito de fora, por dedução a partir dos
 * nomes dos sistemas. Alguns termos provavelmente estão errados e outros
 * importantes estão faltando. Ele foi escrito assim de propósito: corrigir uma
 * lista é muito mais rápido que escrever uma em branco.
 *
 * Quem usa cada sistema é quem sabe as palavras. Ao ajustar, o critério é um
 * só: a palavra aparece quando alguém RECLAMA daquele sistema? Se sim, entra.
 * Se é jargão de manual que ninguém fala, não entra.
 *
 * Sistema que não estiver aqui continua funcionando — só não ganha a ajuda
 * extra. Não é preciso preencher todos para valer a pena.
 */

export interface SistemaConhecido {
  /** Slug do ecossistema. Precisa bater com o que o HUB devolve. */
  slug: string;
  /** Uma linha sobre o que ele resolve, em linguagem de quem usa. */
  faz: string;
  /** As palavras que, aparecendo numa conversa, apontam para este sistema. */
  palavras: string[];
}

export const SISTEMAS_CONHECIDOS: SistemaConhecido[] = [
  {
    slug: "processos",
    faz: "Mapeia e padroniza os processos da empresa. Também chamado de SGPO.",
    palavras: [
      "ritual", "POP", "procedimento", "procedimento operacional", "fluxo",
      "macroprocesso", "cadeia de valor", "dono do processo", "padronização",
    ],
  },
  {
    slug: "rh",
    faz: "Cadastro de colaborador, férias, folha, ponto e documentos de pessoal.",
    palavras: [
      "colaborador", "funcionário", "admissão", "demissão", "desligamento",
      "férias", "folha", "holerite", "ponto", "cartão de ponto", "EPI",
      "atestado", "salário",
    ],
  },
  {
    slug: "gestao-comercial",
    faz: "Pedidos, propostas, clientes e acompanhamento de vendas.",
    palavras: [
      "pedido", "proposta", "orçamento", "cliente", "venda", "comissão",
      "tabela de preço", "desconto",
    ],
  },
  {
    slug: "obra",
    faz: "Acompanhamento de obra: cronograma, medição, diário e equipes em campo.",
    palavras: [
      "obra", "canteiro", "cronograma", "medição", "diário de obra", "empreiteiro",
      "etapa da obra", "centro de custo",
    ],
  },
  {
    slug: "suprimentos",
    faz: "Compras, cotação, fornecedores e estoque.",
    palavras: [
      "compra", "cotação", "fornecedor", "estoque", "requisição", "nota fiscal",
      "recebimento", "almoxarifado",
    ],
  },
  {
    slug: "financeiro",
    faz: "Contas a pagar e receber, conciliação e fechamento.",
    palavras: [
      "boleto", "pagamento", "recebimento", "conciliação", "extrato",
      "fechamento", "contas a pagar", "contas a receber", "nota",
    ],
  },
  {
    slug: "automacoes",
    faz: "O próprio Gestor de Automações: demandas, chamados e este portal.",
    palavras: [
      "demanda", "chamado", "portal", "solicitação", "kanban", "inbox", "Blink",
    ],
  },
];

/**
 * Monta o bloco que entra no prompt, só com os sistemas que o HUB devolveu.
 *
 * O filtro existe para não descrever sistema que a pessoa não tem acesso ou
 * que saiu do ar: o catálogo vivo manda, e este arquivo apenas enriquece o que
 * já está lá. Se o slug não vier do HUB, não aparece — mesmo estando escrito
 * aqui.
 */
export function blocoDeVocabulario(
  doHub: Array<{ slug?: string; nome?: string }>,
): string {
  const slugsVivos = new Set(doHub.map((s) => (s.slug ?? "").toLowerCase()));
  const nomePorSlug = new Map(
    doHub.map((s) => [(s.slug ?? "").toLowerCase(), s.nome ?? s.slug ?? ""]),
  );

  const linhas = SISTEMAS_CONHECIDOS.filter((s) => slugsVivos.has(s.slug)).map((s) => {
    const nome = nomePorSlug.get(s.slug) || s.slug;
    return `${nome}\n  O que faz: ${s.faz}\n  Palavras típicas: ${s.palavras.join(", ")}`;
  });

  if (linhas.length === 0) return "";

  return `\n\nO QUE CADA SISTEMA FAZ E COMO AS PESSOAS FALAM DELE

Use isto para reconhecer o sistema pelas palavras da pessoa, sem precisar
perguntar. Se ela disser "ritual", é o de processos — não pergunte de novo.

${linhas.join("\n\n")}

Se as palavras apontarem para um sistema com clareza, considere identificado e
gaste a pergunta em outra coisa. Se apontarem para dois, pergunte entre esses
dois. Se não apontarem para nenhum, pergunte oferecendo os mais prováveis.`;
}
