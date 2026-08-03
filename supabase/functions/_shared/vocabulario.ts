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
 * DE ONDE VEIO ESTE CONTEÚDO
 * Cada um dos treze sistemas foi consultado sobre as próprias telas e botões.
 * O que está aqui não é dedução de fora: são nomes que existem de fato na
 * interface de cada um.
 *
 * O QUE FICOU DE FORA — E ISSO É A PARTE MAIS IMPORTANTE
 * Palavra genérica não entra: Dashboard, Relatórios, Usuários, Ajuda,
 * Configurações, Salvar, Editar, Fornecedor, Empreendimento. Elas existem em
 * quase todos os treze, e o casamento aqui é por conteúdo — uma palavra
 * compartilhada apontaria para treze sistemas ao mesmo tempo, e o desempate
 * escolheria um deles ao acaso.
 *
 * Vocabulário ambíguo é PIOR que vocabulário ausente. Sem a palavra, o Blink
 * pergunta; com a palavra errada, ele afirma — e afirmar errado manda a
 * demanda para a fila de outra pessoa. Na dúvida sobre um termo, deixe fora.
 *
 * O critério para incluir: a palavra aparece quando alguém reclama daquele
 * sistema, e só daquele?
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
    faz: "Guarda os procedimentos escritos da empresa (POPs) e organiza as tarefas do dia (rituais).",
    palavras: [
      "ritual", "rituais", "POP", "POPs", "procedimento operacional",
      "biblioteca de POPs", "SGPO", "macroprocesso", "propor alteracao",
      "troubleshooting", "fluxograma", "meus rituais", "ocorrencia",
      "reagendar ocorrencia", "periodicidade", "sob demanda",
      "catalogo de rituais",
    ],
  },
  {
    slug: "rh",
    faz: "Cadastro de colaborador, admissao, documentos, exames, vagas, ferias, ponto, PDI e avaliacoes.",
    palavras: [
      "colaborador", "colaboradores", "admissao", "desligamento", "ferias",
      "holerite", "PDI", "exame admissional", "exame ocupacional", "ASO",
      "EPI", "CTPS", "organograma", "descritivo de cargo", "vaga",
      "banco de candidatos", "banco de talentos", "profiler", "fit cultural",
      "perfil DISC", "onboarding", "plano 30-60-90", "ciclo de avaliacao",
    ],
  },
  {
    slug: "gestao-comercial",
    faz: "Corretores, vendas e reservas de unidades, tabela de precos e despesas de marketing.",
    palavras: [
      "corretor", "corretores", "comissao", "comissoes", "CRECI",
      "tabela de vendas", "reserva", "unidade", "pavimento", "torre",
      "tropa de elite", "mural da tropa", "aniversariantes",
      "simulacao de pagamento", "mapa de cotacao", "composicao aprovada",
      "derrubar", "trafego pago", "orulo",
    ],
  },
  {
    slug: "obra",
    faz: "Registra a producao diaria da obra e organiza planejamento, folha por producao, qualidade e seguranca.",
    palavras: [
      "produtividade", "captura", "levantamento", "curto prazo", "medio prazo",
      "PPC", "fechamento mensal", "razao de atraso", "licoes aprendidas",
      "calculo de remuneracao", "quantitativo", "FVS", "RNC", "PES", "PQO",
      "APR", "DDS", "PGR", "PCMSO", "PCMAT", "ficha de EPI",
      "permissao de trabalho", "inspetor", "visita tecnica",
      "inventario de riscos", "canteiro",
    ],
  },
  {
    slug: "suprimentos",
    faz: "Pedido, cotacao, aprovacao, recebimento, estoque e devolucao dos equipamentos alugados das obras.",
    palavras: [
      "locacao", "solicitacao de locacao", "proposta vencedora",
      "aguardando material", "estoque ativo", "kardex", "baixa manual",
      "inventario fisico", "devolucao", "avaria", "avarias", "almoxarife",
      "vigencia", "dias restantes",
    ],
  },
  {
    slug: "financeiro",
    faz: "Fluxo de caixa das SPEs, cobranca de inadimplentes e entregas contabeis de cada empresa.",
    palavras: [
      "SPE", "inadimplencia", "regua de cobranca", "recebivel", "recebiveis",
      "obrigacao", "controle de entregas", "competencia", "escritorio contabil",
      "balancete", "achado", "aging", "regime tributario", "conciliacao",
      "projecao de fluxo", "credor", "achados abertos",
    ],
  },
  {
    slug: "incorporacao",
    faz: "Acompanha o empreendimento do briefing a entrega: propostas, contratos, medicoes, legalizacao e certidoes.",
    palavras: [
      "certidao", "certidoes negativas", "RFP", "solicitacao de proposta",
      "medicao", "medicoes", "entregavel", "entregaveis", "stakeholder",
      "legalizacao", "roteiro de etapas", "checklist documental",
      "interferencia", "BIM", "ata de reuniao", "licao aprendida",
      "signatario", "modelo de multa", "orgao publico",
    ],
  },
  {
    slug: "portfolio",
    faz: "Reune todos os empreendimentos da empresa com numeros, etapa, responsaveis e SPEs.",
    palavras: [
      "portfolio", "vincular a existente", "sincronizar com analise",
      "desvincular", "societario", "estrutura societaria", "TIR media",
      "VGV total", "distribuicao por etapa", "vincular ao sienge",
      "ID externo", "mapa interativo",
    ],
  },
  {
    slug: "viabuilder",
    faz: "Diz se um terreno vale a pena virar predio e monta o fluxo de caixa e o funding do projeto.",
    palavras: [
      "viabuilder", "analise preliminar", "viabilidade dinamica",
      "matriz de sensibilidade", "areas equivalentes", "curva de obra",
      "curva de vendas", "exposicao maxima", "capital stack", "funding",
      "desembolso", "custos indiretos", "custos diretos", "multifase",
      "defasagem", "indice de aproveitamento", "permuta", "preco fechado",
      "preco de custo", "auto-dimensionar investidor", "DRE consolidada",
      "gap total",
    ],
  },
  {
    slug: "atividades",
    faz: "Recebe pelo WhatsApp o que cada lider esta fazendo e mostra num quadro para o gestor.",
    palavras: [
      "lider", "lideres", "visao do gestor", "explorar por data",
      "envio automatico", "lembrete vespertino", "horario de envio",
      "disparar agora", "log de interacoes", "mensagens enviadas",
      "script para 1:1", "foco da semana", "gargalos",
      "#atividades", "#minhalista", "#feito",
    ],
  },
  {
    slug: "crm-house",
    faz: "Recebe leads das campanhas, distribui entre corretores e cobra as tarefas de follow-up.",
    palavras: [
      "lead", "leads", "cadencia", "cadencias", "roleta de vendas", "roleta",
      "painel de vendas", "etapa do funil", "motivo da perda", "temperatura",
      "score de propensao", "controle de atividades",
      "decisao de fim de cadencia", "pausa do lead", "biblioteca de tarefas",
      "recalcular vencimentos", "importar leads", "duplicado",
    ],
  },
  {
    slug: "nakhon",
    faz: "Monta o fluxo de pagamento de uma unidade e gera o contrato/proposta do comprador.",
    palavras: [
      "gerador de fluxo", "gerador de contratos", "nakhon", "manaira",
      "fracao ideal", "parcelas intercaladas", "parcelamento do saldo",
      "cronograma de pagamentos", "export completo", "segundo comprador",
      "finalizar proposta", "acessar proposta", "balao", "reforco",
    ],
  },
  {
    slug: "gestao-projetos",
    faz: "Leva um empreendimento do briefing do terreno aos documentos para investidores.",
    palavras: [
      "desenvolvimento de produto", "briefing", "mix de unidades", "tipologia",
      "tipologias", "programa de necessidades", "amenidades", "plano macro",
      "PMBOK", "termo de abertura", "plano de escopo", "DRE evolutiva",
      "matriz de riscos", "monte carlo", "pitch deck", "one-pager",
      "business plan", "imagem conceitual", "recalcular tempos", "WBS",
    ],
  },
  {
    slug: "automacoes",
    faz: "O proprio Gestor de Automacoes: demandas, chamados e este portal.",
    palavras: ["demanda", "chamado", "portal", "inbox", "Blink", "triagem"],
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
