import type { Demanda } from "../types";
import type { Evento } from "./fio";

/**
 * A linha do tempo da demanda — onde ela está, e há quanto tempo.
 *
 * POR QUE ISTO NÃO É UM WIZARD
 * Wizard promete uma coisa que não é verdade: que o trabalho anda para frente,
 * um passo de cada vez, e que cada passo atrás é um erro. Uma demanda real
 * volta de homologação para desenvolvimento, pula testes, fica três semanas
 * numa etapa e atravessa outra em dez minutos. Um wizard desenha tudo isso
 * como se fosse igual.
 *
 * O que faz esta linha ser viva, e não um wizard, são três coisas que só o
 * histórico responde:
 *
 *   TEMPO EM CADA ETAPA   "Em desenvolvimento" não diz nada. "Em
 *                         desenvolvimento há 19 dias" diz tudo.
 *   ETAPA PULADA          se a demanda foi de "A Fazer" direto para
 *                         "Concluído", testes não foi cumprida — foi pulada.
 *                         Wizard pinta as duas de verde igual, e essa é a
 *                         mentira mais cara, porque some com a informação de
 *                         que ninguém testou.
 *   RETRABALHO            voltar não é regressão de barra de progresso, é um
 *                         fato do projeto. Três voltas de homologação para
 *                         desenvolvimento é o sinal mais forte de requisito
 *                         mal entendido — e some se a tela só mostrar o estado
 *                         atual.
 *
 * NADA AQUI CHAMA IA
 * É tudo derivado da auditoria que já está no banco: instantâneo, offline e de
 * custo zero. Encaixa na regra do projeto — IA só onde há geração de
 * conhecimento, e "há quanto tempo isto está parado" é subtração de datas.
 */

export type EstadoDaEtapa = "concluida" | "atual" | "futura" | "pulada";

export interface Etapa {
  id: string;
  rotulo: string;
  estado: EstadoDaEtapa;
  /** Quando a demanda entrou aqui. `null` para etapa futura ou pulada. */
  entrouEm: string | null;
  /** Dias passados nesta etapa. Para a atual, dias até agora. */
  dias: number | null;
}

export interface Progressao {
  etapas: Etapa[];
  /** Quantas vezes a demanda voltou para uma etapa anterior. */
  retrabalho: number;
  /** Dias na etapa atual — o número que denuncia demanda esquecida. */
  diasNaAtual: number | null;
}

const DIA = 24 * 60 * 60 * 1000;

/**
 * Extrai a sequência de status pela qual a demanda passou, em ordem.
 *
 * A auditoria guarda o texto já traduzido ("moveu para A Fazer"), então a
 * ordem cronológica das mudanças é a única fonte confiável — por isso a
 * detecção usa o rótulo da etapa, e não o campo cru.
 */
function passagens(
  eventos: Evento[],
  etapas: { id: string; rotulo: string }[],
): Array<{ etapaId: string; em: string }> {
  const porRotulo = new Map(etapas.map((e) => [e.rotulo.toLowerCase(), e.id]));
  const saida: Array<{ etapaId: string; em: string }> = [];

  for (const e of eventos) {
    if (e.tipo !== "mudanca") continue;
    const alvo = /moveu para (.+)$/i.exec(e.texto)?.[1]?.trim().toLowerCase();
    if (!alvo) continue;
    const etapaId = porRotulo.get(alvo);
    if (etapaId) saida.push({ etapaId, em: e.em });
  }
  return saida;
}

export function montarProgressao(
  d: Demanda,
  eventos: Evento[],
  etapas: { id: string; rotulo: string }[],
  agora = Date.now(),
): Progressao {
  const indiceDe = new Map(etapas.map((e, i) => [e.id, i]));
  const atual = indiceDe.get(d.status.id) ?? 0;

  const historico = passagens(eventos, etapas);

  // Quantas vezes andou para trás. Contado sobre o histórico, não sobre o
  // estado: quem só olha o estado atual nunca sabe quantas voltas custou.
  let retrabalho = 0;
  for (let i = 1; i < historico.length; i += 1) {
    const de = indiceDe.get(historico[i - 1].etapaId) ?? 0;
    const para = indiceDe.get(historico[i].etapaId) ?? 0;
    if (para < de) retrabalho += 1;
  }

  // Primeira entrada em cada etapa. Reentrar depois de voltar não reinicia a
  // contagem: o que interessa é desde quando aquela etapa começou a existir na
  // história da demanda.
  const primeiraEntrada = new Map<string, string>();
  for (const p of historico) {
    if (!primeiraEntrada.has(p.etapaId)) primeiraEntrada.set(p.etapaId, p.em);
  }

  const entradaNaAtual = [...historico].reverse().find((p) => p.etapaId === d.status.id)?.em ?? null;
  const diasNaAtual = entradaNaAtual
    ? Math.floor((agora - new Date(entradaNaAtual).getTime()) / DIA)
    : d.diasParada || null;

  const lista: Etapa[] = etapas.map((e, i) => {
    const entrouEm = primeiraEntrada.get(e.id) ?? (i === 0 ? d.criadaEm : null);

    let estado: EstadoDaEtapa;
    if (i === atual) estado = "atual";
    else if (i > atual) estado = "futura";
    // Antes da etapa atual: cumprida só se a demanda de fato passou por ela.
    // Sem registro de passagem, foi pulada — e dizer isso é o ponto.
    else estado = entrouEm ? "concluida" : "pulada";

    let dias: number | null = null;
    if (entrouEm) {
      const fim =
        i === atual
          ? agora
          : (historico.find((p) => new Date(p.em) > new Date(entrouEm))?.em
              ? new Date(historico.find((p) => new Date(p.em) > new Date(entrouEm))!.em).getTime()
              : agora);
      dias = Math.max(0, Math.floor((fim - new Date(entrouEm).getTime()) / DIA));
    }

    return { id: e.id, rotulo: e.rotulo, estado, entrouEm, dias };
  });

  return { etapas: lista, retrabalho, diasNaAtual };
}
