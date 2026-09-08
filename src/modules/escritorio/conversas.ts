/**
 * ROTEIRISTA — a única fonte das falas entre BLINKs.
 *
 * Nada de frase solta dentro de componente visual: o mapa, o motor de
 * movimento e o balão não sabem o que está sendo dito. Eles pedem um roteiro
 * aqui e recebem uma lista de linhas.
 *
 * QUEM conversa com quem NÃO se decide aqui. Vem do EVENTO real e do grafo de
 * integrações do HUB, no motor. Este módulo só escolhe AS PALAVRAS.
 *
 * São duas origens de fala, nesta ordem de importância:
 *
 *  1. `dialogoDeEvento` — a conversa nasceu de uma mudança real no retrato do
 *     ecossistema. A frase é montada SÓ com o tipo do evento, o nome do
 *     sistema e, quando o dado sustenta, a marca de falha vinda de terceiro.
 *
 *  2. `dialogoPara` — conversa ambiental, sem evento por trás. Existe como
 *     comportamento secundário e raro; nunca simula problema.
 *
 * REGRA DE CONTEÚDO: nenhuma fala cita pessoa, documento, valor, cliente ou
 * qualquer dado. Só o contexto funcional do sistema.
 */

import { chaveDeGrupo } from "./layout";
import type { EventoEcossistema, TipoEvento } from "./eventos";

export interface Interlocutor {
  id: string;
  nome: string;
  grupo: string;
}

export interface Fala {
  quem: "a" | "b";
  texto: string;
}

type Alvo = { area: string } | { sistema: string } | "*";

export interface RegraConversa {
  id: string;
  a: Alvo;
  b: Alvo;
  /** Quando duas regras servem ao mesmo par, ganha a maior. */
  prioridade: number;
  /** Peso no sorteio quando há empate de prioridade (0..1). */
  frequencia: number;
  /** Segundos até a MESMA regra poder repetir. */
  cooldown: number;
  mesmaArea?: boolean;
  trocas: { abre: string; responde: string }[];
}

export const FECHOS = [
  "Beleza, quando tiver retorno me avisa.",
  "Combinado, seguimos assim.",
  "Perfeito, obrigado!",
  "Tranquilo, qualquer coisa me chama.",
  "Show, fico no aguardo.",
];

export const REGRAS: RegraConversa[] = [
  {
    id: "comercial-captacao",
    a: { area: "COMERCIAL" },
    b: { sistema: "captacao" },
    prioridade: 4,
    frequencia: 0.9,
    cooldown: 60,
    trocas: [
      { abre: "Você conseguiu verificar aquela captação?", responde: "Sim, estou conferindo os dados antes de avançar." },
      { abre: "A captação daquele empreendimento já entrou?", responde: "Entrou. Só falta eu validar aqui." },
      { abre: "Consegue olhar a captação que subiu hoje?", responde: "Vou abrir agora e te retorno." },
      { abre: "Aquela captação já foi conferida?", responde: "Estou terminando de validar." },
      { abre: "Preciso do retorno daquela captação.", responde: "Te aviso assim que fechar." },
    ],
  },
  {
    id: "comercial-financeiro",
    a: { area: "COMERCIAL" },
    b: { area: "FINANCEIRO" },
    prioridade: 3,
    frequencia: 0.9,
    cooldown: 60,
    trocas: [
      { abre: "Essa proposta já foi encaminhada para o financeiro?", responde: "Recebi. Vou conferir antes de liberar." },
      { abre: "Aquela proposta já chegou para vocês?", responde: "Chegou. Vou validar os dados." },
      { abre: "Conseguiu olhar aquela solicitação?", responde: "Estou verificando agora." },
      { abre: "O financeiro já liberou aquilo?", responde: "Ainda estou conferindo." },
      { abre: "Falta alguma coisa da minha parte?", responde: "Não, está tudo aqui." },
    ],
  },
  {
    id: "comercial-juridico",
    a: { area: "COMERCIAL" },
    b: { area: "JURIDICO" },
    prioridade: 4,
    frequencia: 0.8,
    cooldown: 70,
    trocas: [
      { abre: "O contrato dessa venda já pode ser gerado?", responde: "Já estou com a minuta em revisão." },
      { abre: "Precisamos do contrato ainda hoje, dá?", responde: "Dá sim, termino a revisão e te devolvo." },
      { abre: "A minuta daquela proposta já saiu?", responde: "Saiu, está aguardando assinatura." },
      { abre: "Consegue revisar isso hoje?", responde: "Consigo, entro nele agora." },
      { abre: "O cliente está esperando o contrato.", responde: "Já é o próximo da fila." },
    ],
  },
  {
    id: "rh-obra",
    a: { area: "PESSOAS" },
    b: { sistema: "obra" },
    prioridade: 5,
    frequencia: 0.9,
    cooldown: 70,
    trocas: [
      { abre: "O exame daquele colaborador já foi enviado?", responde: "Ainda não. Vou verificar a documentação." },
      { abre: "A equipe nova já está liberada para o canteiro?", responde: "Falta um documento. Assim que chegar eu libero." },
      { abre: "Conseguiu conferir a lista de quem está alocado?", responde: "Confiro hoje e te devolvo atualizada." },
      { abre: "Falta alguém para liberar no canteiro?", responde: "Só um, estou atrás do documento." },
      { abre: "A equipe da semana já está definida?", responde: "Fecho hoje e te mando." },
    ],
  },
  {
    id: "rh-operacao",
    a: { area: "PESSOAS" },
    b: { area: "OPERACAO" },
    prioridade: 3,
    frequencia: 0.8,
    cooldown: 60,
    trocas: [
      { abre: "Os líderes já foram atualizados no processo?", responde: "Já sincronizou aqui, está tudo certo." },
      { abre: "Conseguiu conferir os setores que mudaram?", responde: "Vou revisar e te aviso." },
      { abre: "As atividades foram redistribuídas depois da mudança?", responde: "Estou redistribuindo agora." },
      { abre: "Precisamos revisar os responsáveis.", responde: "Pode deixar, ajusto aqui." },
      { abre: "Mudou gente de setor esta semana?", responde: "Mudou, já estou atualizando." },
    ],
  },
  {
    id: "obra-suprimentos",
    a: { sistema: "obra" },
    b: { area: "SUPRIMENTOS" },
    prioridade: 5,
    frequencia: 0.9,
    cooldown: 60,
    trocas: [
      { abre: "Aquele material já foi solicitado?", responde: "O pedido já foi enviado, estou aguardando o fornecedor." },
      { abre: "Consegue adiantar a entrega do que falta no canteiro?", responde: "Vou cobrar a cotação hoje mesmo." },
      { abre: "A requisição da obra chegou aí?", responde: "Chegou. Falta só a última cotação." },
      { abre: "Falta material para começar amanhã.", responde: "Vou ver o que consigo antecipar." },
      { abre: "Aquela entrega tem previsão?", responde: "Estou confirmando com o fornecedor." },
    ],
  },
  {
    id: "suprimentos-financeiro",
    a: { area: "SUPRIMENTOS" },
    b: { area: "FINANCEIRO" },
    prioridade: 4,
    frequencia: 0.85,
    cooldown: 60,
    trocas: [
      { abre: "Aquele pedido já foi aprovado para pagamento?", responde: "Estou conferindo antes de liberar." },
      { abre: "Consegue olhar a aprovação daquela compra?", responde: "Vou verificar e te retorno ainda hoje." },
      { abre: "A cotação já pode seguir para o financeiro?", responde: "Pode. Assim que chegar eu confiro." },
      { abre: "Precisa de mais alguma coisa para aprovar?", responde: "Só a última conferência." },
      { abre: "Dá para adiantar essa aprovação?", responde: "Vejo ainda hoje." },
    ],
  },
  {
    id: "engenharia-incorporacao",
    a: { area: "ENGENHARIA" },
    b: { area: "INCORPORACAO" },
    prioridade: 4,
    frequencia: 0.85,
    cooldown: 60,
    trocas: [
      { abre: "A viabilidade daquele estudo já saiu?", responde: "Saiu. Vou lançar no portfólio." },
      { abre: "Terminei a análise do produto, consegue conferir?", responde: "Consigo, abro aqui e comparo com o estudo." },
      { abre: "Esse empreendimento já entrou no portfólio?", responde: "Entrou hoje, só falta revisar as etapas." },
      { abre: "Os números do estudo batem com os seus?", responde: "Batem, já confirmei aqui." },
      { abre: "Precisa de mais alguma informação minha?", responde: "Por enquanto não, obrigado." },
    ],
  },
  {
    id: "juridico-incorporacao",
    a: { area: "JURIDICO" },
    b: { area: "INCORPORACAO" },
    prioridade: 4,
    frequencia: 0.7,
    cooldown: 80,
    trocas: [
      { abre: "O contrato desse empreendimento já pode ser montado?", responde: "Pode, a incorporação já está aprovada." },
      { abre: "Preciso conferir as condições antes de gerar a minuta.", responde: "Te passo as condições atualizadas hoje." },
      { abre: "Falta algum documento do empreendimento?", responde: "Falta um, já pedi." },
    ],
  },
  {
    id: "tecnologia-qualquer",
    a: { area: "TECNOLOGIA" },
    b: "*",
    prioridade: 2,
    frequencia: 0.7,
    cooldown: 50,
    trocas: [
      { abre: "A automação de vocês voltou a rodar?", responde: "Voltou sim, obrigado por olhar." },
      { abre: "Vou verificar a integração daqui, notou lentidão?", responde: "Notei mais cedo, agora parece normal." },
      { abre: "Preciso rodar um processamento, atrapalha aí?", responde: "Pode rodar, aqui está tranquilo." },
      { abre: "Está tudo respondendo bem por aí?", responde: "Está, sem reclamação hoje." },
      { abre: "Vou subir um ajuste, tudo bem?", responde: "Tudo bem, pode subir." },
    ],
  },
  {
    id: "mesma-area",
    a: "*",
    b: "*",
    mesmaArea: true,
    prioridade: 1,
    frequencia: 0.5,
    cooldown: 45,
    trocas: [
      { abre: "Você já terminou essa demanda?", responde: "Quase. Estou só conferindo antes de fechar." },
      { abre: "Consegue assumir essa parte comigo?", responde: "Consigo, me passa que eu sigo daqui." },
      { abre: "Isso aqui já foi revisado?", responde: "Já revisei, pode seguir." },
      { abre: "Precisa de ajuda com isso?", responde: "Se puder olhar depois, ajuda." },
      { abre: "Isso aqui é prioridade?", responde: "É, deixei no topo." },
    ],
  },
];

/**
 * Falas por tipo de evento.
 *
 * `{sistema}` é o ÚNICO buraco interpolável, e recebe o NOME do sistema — o
 * mesmo rótulo que já aparece na placa da mesa. Nenhum outro campo do evento
 * chega ao balão: nada de id, contador, timestamp, integração ou payload.
 */
export const FALAS_DE_EVENTO: Record<TipoEvento, { abre: string[]; responde: string[] }> = {
  executou: {
    abre: [
      "Chamei o {destino} {n} vezes agora.",
      "{n} chamadas ao {destino} neste minuto.",
      "Acabei de rodar {n} vezes contra o {destino}.",
      "Puxei dado do {destino}: {n} chamadas.",
      "Terminei uma rajada de {n} no {destino}.",
      "{n} execuções contra o {destino}, agora.",
    ],
    responde: [
      "Recebido.",
      "Anotado aqui.",
      "Certo, vou acompanhar o volume.",
      "Beleza, está registrado.",
      "Ok, fico de olho.",
      "Entendido.",
    ],
  },
  entrou_em_falha: {
    abre: [
      "O {sistema} entrou em falha.",
      "O {sistema} parou de responder.",
      "O {sistema} caiu agora há pouco.",
      "Perdemos o {sistema} agora.",
      "O {sistema} travou aqui.",
      "Deu problema no {sistema}.",
    ],
    responde: [
      "Vou verificar a integração.",
      "Vou olhar o processamento.",
      "Já estou verificando.",
      "Deixa que eu olho isso.",
      "Vou conferir o que derrubou.",
      "Já abri para investigar.",
    ],
  },
  falha_nova: {
    abre: [
      "O {sistema} apresentou novas falhas.",
      "Detectei falhas novas no {sistema}.",
      "Começaram a aparecer falhas no {sistema}.",
      "O {sistema} está falhando de novo.",
      "Voltaram a aparecer erros no {sistema}.",
      "O {sistema} acumulou falhas agora.",
    ],
    responde: [
      "Vou conferir o que aconteceu.",
      "Vou verificar a integração.",
      "Vou acompanhar isso agora.",
      "Já estou olhando os erros.",
      "Deixa que eu investigo.",
      "Vou ver de onde vem.",
    ],
  },
  recuperado: {
    abre: [
      "O {sistema} voltou a funcionar.",
      "O {sistema} normalizou.",
      "O {sistema} está respondendo de novo.",
      "O {sistema} voltou ao normal.",
      "Recuperamos o {sistema}.",
      "O {sistema} estabilizou.",
    ],
    responde: [
      "Boa. Vou acompanhar.",
      "Perfeito.",
      "Ótimo, fico de olho.",
      "Que bom. Encerro aqui então.",
      "Ótima notícia.",
      "Beleza, continuo monitorando.",
    ],
  },
  voltou_a_reportar: {
    abre: [
      "O {sistema} voltou a reportar.",
      "Voltamos a receber dados do {sistema}.",
      "O {sistema} apareceu de novo no painel.",
      "Chegou informação do {sistema} outra vez.",
    ],
    responde: [
      "Boa. Vou acompanhar.",
      "Perfeito, obrigado.",
      "Ótimo, já estava estranho o silêncio.",
      "Beleza, vou olhar o histórico.",
    ],
  },
  comecou_a_executar: {
    abre: [
      "O {sistema} começou a executar.",
      "O {sistema} entrou em operação.",
      "O {sistema} rodou pela primeira vez.",
      "O {sistema} está processando agora.",
    ],
    responde: [
      "Ótimo, vou acompanhar.",
      "Perfeito.",
      "Boa, vou olhar os números.",
      "Beleza, fico de olho.",
    ],
  },
  /*
   * Falas de demanda. O texto NÃO diz de qual sistema a demanda é, porque
   * esse vínculo não existe no dado — e {sistema} aqui é o BLINK que
   * representa o Kanban, não o dono da demanda. Nada do conteúdo da demanda
   * entra no balão: nem título, nem código, nem responsável.
   */
  demanda_nova: {
    abre: [
      "Entrou uma demanda nova por aqui.",
      "Chegou demanda nova na fila.",
      "Abriram mais uma demanda.",
      "Tem demanda nova esperando.",
    ],
    responde: [
      "Certo, vou acompanhar.",
      "Beleza, fico de olho.",
      "Já vi, vou priorizar.",
      "Anotado.",
    ],
  },
  demanda_avancou: {
    abre: [
      "Uma demanda avançou de etapa.",
      "Já estão trabalhando naquela demanda.",
      "Aquela demanda mudou de fase.",
      "A demanda saiu da fila.",
    ],
    responde: [
      "Ótimo, vou acompanhar.",
      "Boa, obrigado pelo aviso.",
      "Perfeito, vou seguir de perto.",
      "Beleza, fico esperando.",
    ],
  },
  demanda_concluida: {
    abre: [
      "Uma demanda foi concluída.",
      "Fechamos mais uma demanda.",
      "Aquela demanda saiu.",
      "Terminamos uma demanda agora.",
    ],
    responde: [
      "Perfeito.",
      "Ótima notícia.",
      "Boa, isso libera espaço na fila.",
      "Muito bom.",
    ],
  },
};

/**
 * Quando o retrato diz que a maioria das falhas veio de fora, o tom muda.
 * NÃO se diz QUAL serviço: esse dado não existe no retrato de hoje.
 */
/**
 * A rajada de execuções.
 *
 * Os números NÃO são enfeite: `{n}` é a contagem que o HUB registrou e `{f}` a
 * de falhas. É a diferença entre "o Sienge tem 457 execuções no mês" e "chamei
 * o Sienge 35 vezes agora, 3 deram erro" — a segunda é um acontecimento, e é
 * verificável linha por linha em `integracao_execucoes`.
 *
 * Uma rajada com falha tem banco próprio, como o upstream: dizer "correu tudo
 * bem" quando três chamadas falharam seria a animação contradizendo o dado.
 */
export const FALAS_EXECUCAO_COM_FALHA = {
  abre: [
    "Chamei o {destino} {n} vezes e {f} deram erro.",
    "{n} chamadas ao {destino}, {f} com falha.",
    "Rodei {n} vezes contra o {destino}; {f} não passaram.",
    "Puxei dado do {destino}: {n} chamadas, {f} com erro.",
    "{f} das {n} chamadas ao {destino} falharam.",
  ],
  responde: [
    "Vou olhar essas que falharam.",
    "Deixa que eu vejo o erro.",
    "Vou conferir o que barrou.",
    "Já vou investigar as que caíram.",
    "Anotado — vou rastrear a causa.",
  ],
};

export const FALAS_UPSTREAM = {
  abre: [
    "A falha do {sistema} parece vir de outro serviço.",
    "O {sistema} falhou por causa de outro serviço.",
    "O problema do {sistema} vem de fora.",
    "O {sistema} caiu por causa de uma dependência.",
  ],
  responde: [
    "Vou verificar a integração.",
    "Vou olhar a origem disso.",
    "Vou rastrear de onde vem.",
    "Deixa que eu vejo a ponta.",
  ],
};

/**
 * Sorteia sem repetir a escolha anterior daquela lista.
 *
 * Só recicla quando não há alternativa — lista de um item repete, e tudo bem.
 * Sem isso, com repertório pequeno a mesma frase saía duas vezes seguidas e a
 * conversa parecia um disco riscado.
 */
function sorteiaSemRepetir<T>(
  lista: readonly T[],
  memoria: Map<string, number>,
  chave: string,
  sorteio: () => number,
): T {
  if (lista.length === 0) throw new Error(`lista vazia para ${chave}`);
  if (lista.length === 1) return lista[0];
  const anterior = memoria.get(chave);
  const opcoes = lista.map((_, i) => i).filter((i) => i !== anterior);
  const escolhido = opcoes[Math.floor(sorteio() * opcoes.length)] ?? opcoes[0];
  memoria.set(chave, escolhido);
  return lista[escolhido];
}

/** Único ponto de interpolação. Recebe o nome, nunca o evento inteiro. */
function preencher(
  modelo: string,
  nomeDoSistema: string,
  extras?: { destino?: string; n?: number; f?: number },
): string {
  return modelo
    .replace("{sistema}", nomeDoSistema)
    .replace("{destino}", extras?.destino ?? "o serviço")
    .replace("{n}", String(extras?.n ?? 1))
    .replace("{f}", String(extras?.f ?? 0));
}

/**
 * Roteiro de uma conversa que nasceu de um evento real.
 *
 * Olha apenas `tipo` e `contexto`. Se um campo novo aparecer no evento, ele
 * não vaza para o balão sem alguém mexer aqui de propósito.
 */
export function dialogoDeEvento(
  evento: Pick<EventoEcossistema, "tipo" | "contexto" | "execucoes" | "falhas">,
  nomeDaOrigem: string,
  sorteio: () => number = Math.random,
  memoria: Map<string, number> = new Map(),
  /** Nome do nó chamado — só o evento `executou` usa. */
  nomeDoDestino?: string,
): Fala[] {
  const upstream =
    evento.contexto === "upstream" &&
    (evento.tipo === "falha_nova" || evento.tipo === "entrou_em_falha");
  // Rajada com falha fala de falha. Silenciar isso seria a animação
  // contradizendo o número que a própria fala carrega.
  const comFalha = evento.tipo === "executou" && (evento.falhas ?? 0) > 0;
  const banco = upstream
    ? FALAS_UPSTREAM
    : comFalha
      ? FALAS_EXECUCAO_COM_FALHA
      : FALAS_DE_EVENTO[evento.tipo];
  const chave = upstream ? "upstream" : comFalha ? "executou-falha" : evento.tipo;
  // abertura e resposta guardam índices separados: repetir o par inteiro é
  // tão ruim quanto repetir uma frase
  const abre = sorteiaSemRepetir(banco.abre, memoria, `${chave}:abre`, sorteio);
  const responde = sorteiaSemRepetir(banco.responde, memoria, `${chave}:responde`, sorteio);
  const extras = {
    destino: nomeDoDestino,
    n: evento.execucoes,
    f: evento.falhas,
  };
  return [
    { quem: "a", texto: preencher(abre, nomeDaOrigem, extras) },
    { quem: "b", texto: responde },
  ];
}

function casa(alvo: Alvo, quem: Interlocutor): boolean {
  if (alvo === "*") return true;
  if ("sistema" in alvo) return quem.id === alvo.sistema;
  return chaveDeGrupo(quem.grupo) === alvo.area;
}

/** Regras que servem para o par (a, b), na ordem em que A abre a conversa. */
export function regrasPara(a: Interlocutor, b: Interlocutor): RegraConversa[] {
  const mesma = chaveDeGrupo(a.grupo) === chaveDeGrupo(b.grupo);
  return REGRAS.filter((r) => {
    if (r.mesmaArea) return mesma;
    if (mesma) return false; // regra entre áreas exige áreas diferentes
    return casa(r.a, a) && casa(r.b, b);
  });
}

/**
 * Conversa de reserva, quando nenhuma regra serve ao par.
 *
 * Ela não é genérica de verdade: usa o rótulo da integração que ligou os dois
 * sistemas, que é contexto real vindo do HUB.
 */
export function dialogoDoRotulo(rotulo: string): { abre: string; responde: string } {
  const o = rotulo.trim() || "dados";
  return {
    abre: `Consegue conferir ${o}?`,
    responde: "Consigo, vou verificar aqui e te retorno.",
  };
}

export interface Roteirista {
  /** Falas para um par que o HUB já disse que troca dados. */
  dialogoPara(a: Interlocutor, b: Interlocutor, rotulo: string, agora: number): Fala[];
  /**
   * Falas para um evento real, com a MESMA memória anti-repetição que o
   * diálogo ambiental já tinha. A versão solta em `dialogoDeEvento` não
   * guardava nada, e por isso a mesma frase saía em conversas seguidas.
   */
  dialogoDeEvento(
    evento: Pick<EventoEcossistema, "tipo" | "contexto" | "execucoes" | "falhas">,
    nomeDaOrigem: string,
    /** Nome do nó chamado — só o evento `executou` usa. */
    nomeDoDestino?: string,
  ): Fala[];
  /** Regra escolhida para o par, ou null quando cai no rótulo da integração. */
  regraDe(a: Interlocutor, b: Interlocutor, agora: number): RegraConversa | null;
}

export function criarRoteirista(sorteio: () => number = Math.random): Roteirista {
  const ultimaRegra = new Map<string, number>();
  const ultimaTroca = new Map<string, number>();
  /** Último índice usado por tipo de evento, para não repetir a frase. */
  const memoriaDeEvento = new Map<string, number>();

  function regraDe(a: Interlocutor, b: Interlocutor, agora: number): RegraConversa | null {
    const servem = regrasPara(a, b).filter(
      (r) => agora - (ultimaRegra.get(r.id) ?? -Infinity) >= r.cooldown,
    );
    if (!servem.length) return null;
    const topo = Math.max(...servem.map((r) => r.prioridade));
    const finalistas = servem.filter((r) => r.prioridade === topo);
    const total = finalistas.reduce((s, r) => s + r.frequencia, 0);
    let n = sorteio() * total;
    for (const r of finalistas) {
      n -= r.frequencia;
      if (n <= 0) return r;
    }
    return finalistas[finalistas.length - 1];
  }

  function dialogoPara(a: Interlocutor, b: Interlocutor, rotulo: string, agora: number): Fala[] {
    const regra = regraDe(a, b, agora);
    let troca: { abre: string; responde: string };

    if (regra) {
      const anterior = ultimaTroca.get(regra.id);
      const indices = regra.trocas.map((_, i) => i).filter((i) => regra.trocas.length < 2 || i !== anterior);
      const k = indices[Math.floor(sorteio() * indices.length)] ?? 0;
      ultimaTroca.set(regra.id, k);
      ultimaRegra.set(regra.id, agora);
      troca = regra.trocas[k];
    } else {
      troca = dialogoDoRotulo(rotulo);
    }

    const fecho = sorteiaSemRepetir(FECHOS, memoriaDeEvento, "fecho", sorteio);
    return [
      { quem: "a", texto: troca.abre },
      { quem: "b", texto: troca.responde },
      { quem: "a", texto: fecho },
    ];
  }

  return {
    dialogoPara,
    regraDe,
    dialogoDeEvento: (evento, nome, nomeDestino) =>
      dialogoDeEvento(evento, nome, sorteio, memoriaDeEvento, nomeDestino),
  };
}
