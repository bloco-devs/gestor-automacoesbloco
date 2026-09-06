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
  entrou_em_falha: {
    abre: [
      "O {sistema} entrou em falha.",
      "O {sistema} parou de responder.",
      "O {sistema} caiu agora há pouco.",
    ],
    responde: ["Vou verificar a integração.", "Vou olhar o processamento.", "Já estou verificando."],
  },
  falha_nova: {
    abre: [
      "O {sistema} apresentou novas falhas.",
      "Detectei falhas novas no {sistema}.",
      "Começaram a aparecer falhas no {sistema}.",
    ],
    responde: ["Vou conferir o que aconteceu.", "Vou verificar a integração.", "Vou acompanhar isso agora."],
  },
  recuperado: {
    abre: [
      "O {sistema} voltou a funcionar.",
      "O {sistema} normalizou.",
      "O {sistema} está respondendo de novo.",
    ],
    responde: ["Boa. Vou acompanhar.", "Perfeito.", "Ótimo, fico de olho."],
  },
  voltou_a_reportar: {
    abre: ["O {sistema} voltou a reportar.", "Voltamos a receber dados do {sistema}."],
    responde: ["Boa. Vou acompanhar.", "Perfeito, obrigado."],
  },
  comecou_a_executar: {
    abre: ["O {sistema} começou a executar.", "O {sistema} entrou em operação."],
    responde: ["Ótimo, vou acompanhar.", "Perfeito."],
  },
};

/**
 * Quando o retrato diz que a maioria das falhas veio de fora, o tom muda.
 * NÃO se diz QUAL serviço: esse dado não existe no retrato de hoje.
 */
export const FALAS_UPSTREAM = {
  abre: [
    "A falha do {sistema} parece vir de outro serviço.",
    "O {sistema} falhou por causa de outro serviço.",
  ],
  responde: ["Vou verificar a integração.", "Vou olhar a origem disso."],
};

/** Único ponto de interpolação. Recebe o nome, nunca o evento inteiro. */
function preencher(modelo: string, nomeDoSistema: string): string {
  return modelo.replace("{sistema}", nomeDoSistema);
}

/**
 * Roteiro de uma conversa que nasceu de um evento real.
 *
 * Olha apenas `tipo` e `contexto`. Se um campo novo aparecer no evento, ele
 * não vaza para o balão sem alguém mexer aqui de propósito.
 */
export function dialogoDeEvento(
  evento: Pick<EventoEcossistema, "tipo" | "contexto">,
  nomeDaOrigem: string,
  sorteio: () => number = Math.random,
): Fala[] {
  const upstream =
    evento.contexto === "upstream" &&
    (evento.tipo === "falha_nova" || evento.tipo === "entrou_em_falha");
  const banco = upstream ? FALAS_UPSTREAM : FALAS_DE_EVENTO[evento.tipo];
  const abre = banco.abre[Math.floor(sorteio() * banco.abre.length)] ?? banco.abre[0];
  const responde = banco.responde[Math.floor(sorteio() * banco.responde.length)] ?? banco.responde[0];
  return [
    { quem: "a", texto: preencher(abre, nomeDaOrigem) },
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
  /** Regra escolhida para o par, ou null quando cai no rótulo da integração. */
  regraDe(a: Interlocutor, b: Interlocutor, agora: number): RegraConversa | null;
}

export function criarRoteirista(sorteio: () => number = Math.random): Roteirista {
  const ultimaRegra = new Map<string, number>();
  const ultimaTroca = new Map<string, number>();

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

    const fecho = FECHOS[Math.floor(sorteio() * FECHOS.length)] ?? FECHOS[0];
    return [
      { quem: "a", texto: troca.abre },
      { quem: "b", texto: troca.responde },
      { quem: "a", texto: fecho },
    ];
  }

  return { dialogoPara, regraDe };
}
