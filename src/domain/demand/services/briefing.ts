import type { Capacidades, Demanda } from "../types";
import { deQuemEAVez, diasSemFala, type Evento } from "./fio";

/**
 * O briefing de 30 segundos.
 *
 * A MÉTRICA QUE ESTE ARQUIVO EXISTE PARA ATENDER
 * Quando o desenvolvedor abre uma demanda, ele precisa entender tudo em menos
 * de trinta segundos. Uma lista de campos não faz isso: campo responde "qual é
 * o valor de X", e ele não tem a pergunta X — ele tem quatro perguntas, sempre
 * as mesmas, e quer as respostas em ordem:
 *
 *   1. O que estão pedindo?
 *   2. O que já tentaram?
 *   3. O que está travando?
 *   4. Por onde eu começo?
 *
 * Numa demanda com quarenta mensagens, responder isso hoje custa ler quarenta
 * mensagens. O briefing responde antes da leitura — e a leitura vira opcional.
 *
 * TUDO AQUI É DERIVADO, NADA É GERADO
 * Nenhuma linha depende de o modelo de IA responder. São regras sobre dados que
 * já existem, então o briefing nunca fica vazio, nunca fica carregando e nunca
 * inventa. Quando o modelo entrar, ele melhora o TEXTO de `oQuePedem` —
 * substituindo um recorte por um resumo de verdade. A estrutura não muda, e por
 * isso a tela não acende quando a IA funciona nem apaga quando ela falha.
 */

export interface Briefing {
  /** O pedido, em uma frase. */
  oQuePedem: string;
  /** O que a equipe já disse ou fez. Vazio quando ninguém tocou. */
  jaTentado: string[];
  /** O que impede de andar agora. Vazio quando nada impede. */
  travando: string[];
  /** Uma ação. Nunca uma lista: lista é decisão adiada. */
  porOndeComecar: string;
}

/** Corta no limite de palavra, não no meio dela. */
function resumir(texto: string, limite = 180): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite);
  return `${corte.slice(0, corte.lastIndexOf(" "))}…`;
}

export function montarBriefing(
  d: Demanda,
  eventos: Evento[],
  capacidades: Capacidades,
  solicitanteId: string | null,
): Briefing {
  const falas = eventos.filter((e) => e.tipo === "fala");
  const vez = deQuemEAVez(eventos, solicitanteId);
  const silencio = diasSemFala(eventos);

  // A descrição é o pedido original; a primeira fala é a versão em que a
  // pessoa explicou de novo, com as palavras dela. A segunda costuma ser
  // melhor — quem repete, esclarece.
  const oQuePedem = resumir(d.descricao || falas[0]?.texto || d.titulo);

  /**
   * "Já tentado" são as últimas falas de quem NÃO abriu. É o que a equipe
   * disse — e é exatamente o que o desenvolvedor novo precisa para não repetir
   * uma pergunta que já foi feita, que é a forma mais rápida de queimar a
   * paciência de quem pediu.
   */
  const jaTentado = falas
    .filter((e) => e.autor && e.autor.id !== solicitanteId)
    .slice(-3)
    .map((e) => `${e.autor?.ia ? "✦ " : ""}${resumir(e.texto, 100)}`);

  const travando: string[] = [];
  if (!d.concluida) {
    if (d.responsaveis.length === 0) travando.push("Ninguém assumiu.");
    if (vez === "solicitante") travando.push("Esperando quem abriu responder.");
    if (silencio !== null && silencio >= 7) travando.push(`Ninguém fala há ${silencio} dias.`);
    if (capacidades.sla && d.sla?.estado === "estourado") travando.push("O prazo já passou.");
    if (d.diasParada >= 14) travando.push(`Parada no mesmo status há ${d.diasParada} dias.`);
  }

  /**
   * A ordem de precedência é a ordem em que as coisas custam caro se ficarem
   * paradas — não a ordem em que são fáceis de resolver.
   */
  const porOndeComecar = (() => {
    if (d.concluida) return "Nada. Está concluída.";
    if (d.responsaveis.length === 0) return "Assumir, ou atribuir a quem conhece o sistema.";
    if (vez === "equipe") return "Responder — quem abriu está esperando há mais tempo que você.";
    if (capacidades.sla && d.sla?.estado === "estourado") return "Avisar quem abriu que o prazo passou.";
    if (vez === "solicitante" && silencio !== null && silencio >= 5) {
      return "Cobrar a resposta que falta, ou seguir com o que já se sabe.";
    }
    if (jaTentado.length === 0) return "Ler o pedido e dar o primeiro retorno.";
    return "Continuar de onde a última mensagem parou.";
  })();

  return { oQuePedem, jaTentado, travando, porOndeComecar };
}

/**
 * As ações que o copiloto propõe.
 *
 * A DIFERENÇA ENTRE INFORMAR E PROPOR
 * "Esta demanda está parada há 5 dias" é uma frase. Ela informa e devolve o
 * problema para o humano resolver — que é o que quase todo dashboard faz.
 * Propor é oferecer o passo seguinte junto com o diagnóstico, no mesmo lugar,
 * a um clique.
 *
 * Cada ação daqui já existe na porta de escrita. Nenhuma inventa capacidade
 * nova: o copiloto não ganha poder, ganha oportunidade — ele diz o que fazer no
 * instante em que a pessoa entendeu por quê.
 */
export type AcaoSugerida =
  | { tipo: "atribuir"; rotulo: string; motivo: string }
  | { tipo: "cobrar"; rotulo: string; motivo: string; rascunho: string }
  | { tipo: "responder"; rotulo: string; motivo: string; rascunho: string }
  | { tipo: "concluir"; rotulo: string; motivo: string };

export function acoesSugeridas(
  d: Demanda,
  eventos: Evento[],
  solicitanteId: string | null,
): AcaoSugerida[] {
  if (d.concluida) return [];

  const acoes: AcaoSugerida[] = [];
  const vez = deQuemEAVez(eventos, solicitanteId);
  const silencio = diasSemFala(eventos);

  if (d.responsaveis.length === 0) {
    acoes.push({
      tipo: "atribuir",
      rotulo: "Assumir",
      motivo: "Ninguém está com ela.",
    });
  }

  if (vez === "equipe") {
    acoes.push({
      tipo: "responder",
      rotulo: "Responder",
      motivo: "Quem abriu falou por último.",
      // Rascunho, não resposta pronta: ele economiza o começo e obriga a
      // pessoa a completar. Mensagem automática inteira é pior que silêncio,
      // porque quem recebe percebe e para de ler.
      rascunho: "",
    });
  }

  if (vez === "solicitante" && silencio !== null && silencio >= 5) {
    acoes.push({
      tipo: "cobrar",
      rotulo: "Cobrar resposta",
      motivo: `Sem retorno há ${silencio} dias.`,
      rascunho:
        "Oi! Ainda preciso da informação que pedi acima para seguir. Consegue confirmar quando puder?",
    });
  }

  if (d.progresso && d.progresso.feitos === d.progresso.total && d.progresso.total > 0) {
    acoes.push({
      tipo: "concluir",
      rotulo: "Concluir",
      motivo: "Todos os itens do checklist estão feitos.",
    });
  }

  return acoes;
}
