import type { Pessoa } from "../types";

/**
 * O fio da demanda: tudo que aconteceu com ela, em ordem.
 *
 * A DECISÃO CENTRAL — UM FIO, NÃO DUAS LISTAS
 * As fontes guardam duas coisas separadas: comentários (`demand_comments`) e
 * auditoria (`demand_audit_logs`). A tentação é desenhar duas listas. Não
 * fazemos isso, porque quem lê não pensa em duas listas: pensa em *o que
 * aconteceu com o meu pedido*. "Fulano respondeu" e "a demanda foi para
 * desenvolvimento" são o mesmo tipo de fato para quem espera.
 *
 * Então os dois viram `Evento`, e a tela mostra um fio só. A distinção que
 * sobrevive é a que muda o comportamento de quem lê:
 *   FALA      alguém disse algo — pede leitura e pode pedir resposta
 *   MUDANÇA   algo mudou de estado — informa, não pede nada
 *
 * A IA É UM PARTICIPANTE, NÃO UM PAINEL
 * Uma resposta da IA é uma `Fala` com `autor.ia = true`. Ela entra no mesmo
 * fio, na mesma ordem cronológica, com o mesmo peso visual dos humanos, e é
 * distinguida só pelo símbolo. Se a IA tivesse um painel próprio, ela seria um
 * chatbot acoplado ao produto; estando no fio, ela é uma colega que respondeu.
 */

export type TipoDeEvento = "fala" | "mudanca";

export interface AutorDoEvento extends Pessoa {
  /** Marca de origem. Não muda o peso da mensagem, só como ela é identificada. */
  ia: boolean;
}

export interface Evento {
  id: string;
  tipo: TipoDeEvento;
  autor: AutorDoEvento | null;
  em: string;
  /** Para `fala`: o texto. Para `mudanca`: a frase já legível. */
  texto: string;
  /**
   * Nota interna: visível para a equipe, não para quem abriu a demanda.
   * Sempre `false` em `mudanca`.
   */
  interna: boolean;
}

const AUTOR_IA: AutorDoEvento = {
  id: "ia",
  nome: "Assistente",
  avatarUrl: null,
  ia: true,
};

export function autorIa(): AutorDoEvento {
  return AUTOR_IA;
}

/**
 * Traduz um registro de auditoria para uma frase que alguém entende.
 *
 * O log guarda `field_name`, `old_value`, `new_value` — três colunas de banco.
 * Mostrar isso cru ("status: a_fazer → em_desenvolvimento") é vazar o esquema
 * para a tela e obrigar o leitor a decodificar. Quem lê quer a frase.
 */
export function frasePara(
  acao: string,
  campo: string | null,
  de: string | null,
  para: string | null,
  rotulo: (valor: string) => string,
): string {
  if (acao === "create" || acao === "created") return "abriu a demanda";
  if (campo === "status") {
    return para ? `moveu para ${rotulo(para)}` : "mudou o status";
  }
  if (campo === "assigned_to") {
    if (!para) return "removeu o responsável";
    return de ? "trocou o responsável" : "assumiu a demanda";
  }
  if (campo === "priority") return para ? `mudou a prioridade para ${rotulo(para)}` : "mudou a prioridade";
  if (campo === "sla_due_at") return "ajustou o prazo";
  if (campo) return `alterou ${campo.replace(/_/g, " ")}`;
  return acao.replace(/_/g, " ");
}

/**
 * Monta o fio.
 *
 * `internasVisiveis` é do chamador, não do domínio: quem pode ver nota interna
 * é uma regra de permissão, e permissão não mora aqui.
 *
 * Ordem crescente, do mais antigo para o mais novo — como conversa, não como
 * feed. Quem abre uma demanda quer ler a história na ordem em que aconteceu e
 * responder no fim; feed invertido obriga a rolar para cima para entender e
 * para baixo para agir.
 */
export function montarFio(eventos: Evento[], internasVisiveis: boolean): Evento[] {
  return eventos
    .filter((e) => internasVisiveis || !e.interna)
    .slice()
    .sort((a, b) => new Date(a.em).getTime() - new Date(b.em).getTime());
}

/**
 * Quem participou, sem repetir e sem contar a IA como pessoa.
 *
 * Serve ao cabeçalho ("três pessoas nesta demanda") e ao copiloto. A IA fica
 * de fora porque "quem está envolvido" é uma pergunta sobre gente.
 */
export function participantes(eventos: Evento[]): Pessoa[] {
  const vistos = new Map<string, Pessoa>();
  for (const e of eventos) {
    if (!e.autor || e.autor.ia) continue;
    if (!vistos.has(e.autor.id)) vistos.set(e.autor.id, e.autor);
  }
  return [...vistos.values()];
}

/**
 * Há quanto tempo ninguém fala.
 *
 * É o sinal mais honesto de demanda esquecida: uma demanda "em desenvolvimento"
 * há três semanas sem uma única fala não está em desenvolvimento. Devolve
 * `null` quando não há falas — silêncio sem histórico não é silêncio, é
 * demanda nova.
 */
export function diasSemFala(eventos: Evento[], agora = Date.now()): number | null {
  const falas = eventos.filter((e) => e.tipo === "fala");
  if (falas.length === 0) return null;
  const ultima = falas.reduce((max, e) => (new Date(e.em) > new Date(max.em) ? e : max), falas[0]);
  return Math.floor((agora - new Date(ultima.em).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * A demanda está esperando por quem?
 *
 * Regra deliberadamente simples e legível: se a última fala foi de quem abriu,
 * a bola está com a equipe. Se foi da equipe, está com quem abriu. É a mesma
 * pergunta que o Zendesk responde com "aguardando resposta" — e é a informação
 * que mais evita demanda parada, porque parada quase sempre é os dois lados
 * achando que a vez é do outro.
 */
export type Vez = "equipe" | "solicitante" | "ninguem";

export function deQuemEAVez(eventos: Evento[], solicitanteId: string | null): Vez {
  const falas = eventos.filter((e) => e.tipo === "fala" && !e.interna && e.autor);
  if (falas.length === 0) return solicitanteId ? "equipe" : "ninguem";
  const ultima = falas[falas.length - 1];
  if (ultima.autor?.ia) return "solicitante";
  return ultima.autor?.id === solicitanteId ? "equipe" : "solicitante";
}
