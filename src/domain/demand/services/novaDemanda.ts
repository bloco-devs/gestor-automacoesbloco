import type { Complexidade, Prioridade, TipoDemanda } from "../types";

/**
 * O que a IA entrega quando a conversa termina.
 *
 * A DECISÃO DE PRODUTO QUE ESTE ARQUIVO CARREGA
 * Havia duas esteiras: a conversa criava uma `solicitacao`, e alguém depois
 * transformava aquilo numa demanda. A segunda etapa era triagem manual — e a
 * IA existe exatamente para eliminá-la. Pior: a tabela de solicitações não é
 * lida por nenhuma lente do Workspace, então o passo "a IA gera a demanda
 * técnica" terminava num beco.
 *
 * Agora a conversa produz uma `NovaDemanda`, que é uma demanda de verdade —
 * com tipo, complexidade, prioridade e critérios de aceite — e o desenvolvedor
 * a recebe na fila dele, pronta para trabalhar.
 *
 * Este tipo é do domínio, não de tabela nenhuma. A camada de acesso é quem
 * sabe onde gravar.
 */
export interface NovaDemanda {
  titulo: string;
  /** O que a IA entendeu, em linguagem de quem pediu. */
  resumo: string;
  /** A descrição técnica completa, para o desenvolvedor. */
  descricaoTecnica: string;
  tipo: TipoDemanda;
  complexidade: Complexidade;
  prioridade: Prioridade;
  sistemaId: string | null;
  /** Como saber que ficou pronto. Sem isso, "pronto" vira opinião. */
  criteriosDeAceite: string[];
  /** Marca de origem: esta demanda nasceu de uma conversa, não de um formulário. */
  origemIa: true;
  /** O quanto a IA confia na própria leitura, de 0 a 1. */
  confianca: number;
}

/**
 * A conversa produz números de 1 a 10 (herança do formulário de pontuação).
 * A demanda técnica trabalha com três faixas. Traduzir aqui, e não na tela,
 * mantém a régua num lugar só.
 */
export function complexidadeDeEscala(valor: number): Complexidade {
  if (valor <= 3) return "facil";
  if (valor <= 7) return "media";
  return "dificil";
}

/**
 * Prioridade a partir do score do solicitante (0–100).
 *
 * `critica` não sai daqui de propósito: urgência crítica é uma decisão humana
 * sobre contexto que a IA não tem — quem está parado, o que está em jogo hoje.
 * A IA nunca escala sozinha para o topo da fila.
 */
export function prioridadeDeScore(score: number): Prioridade {
  if (score >= 75) return "alta";
  if (score >= 45) return "media";
  return "baixa";
}

/**
 * O tipo da demanda, a partir do que a conversa classificou.
 *
 * O vocabulário do portal ("ajuste em sistema existente") e o do trabalho
 * ("melhoria", "nova funcionalidade") não são o mesmo, e não deveriam ser: um
 * descreve o pedido, o outro descreve o serviço. A tradução é este mapa.
 */
export function tipoDeClassificacao(
  classificacao: "ajuste_existente" | "novo_modulo" | "novo_sistema" | null,
  textoDoPedido: string,
): TipoDemanda {
  // Um relato de coisa quebrada é bug, independente da classificação — e é o
  // caso em que errar o tipo custa mais caro, porque bug tem SLA diferente.
  if (/\b(erro|falha|quebr|não funciona|nao funciona|bug|travou|parou)\b/i.test(textoDoPedido)) {
    return "bug";
  }
  switch (classificacao) {
    case "novo_sistema":
      return "nova_funcionalidade";
    case "novo_modulo":
      return "nova_funcionalidade";
    case "ajuste_existente":
      return "melhoria";
    default:
      return "melhoria";
  }
}

/**
 * Critérios de aceite derivados do que foi conversado.
 *
 * Não é IA: é um piso. Se a conversa não produziu critérios, a demanda nasce
 * com o mínimo verificável em vez de nascer sem nenhum — porque uma demanda
 * sem critério de aceite volta para o desenvolvedor como pergunta, e a
 * pergunta é justamente o que se queria evitar.
 */
export function criteriosMinimos(titulo: string, criterios: string[]): string[] {
  const limpos = criterios.map((c) => c.trim()).filter(Boolean);
  if (limpos.length > 0) return limpos;
  return [`O comportamento descrito em "${titulo}" acontece sem erro.`, "Quem pediu confirma que resolveu."];
}

/**
 * A demanda está boa o suficiente para virar trabalho?
 *
 * Devolve os problemas, não um booleano: a tela precisa dizer o que falta, e
 * "inválido" não ajuda ninguém a consertar.
 */
export function problemasDe(nova: NovaDemanda): string[] {
  const problemas: string[] = [];
  if (nova.titulo.trim().length < 8) problemas.push("O título está curto demais para identificar o pedido.");
  if (nova.resumo.trim().length < 20) problemas.push("O resumo não explica o suficiente.");
  if (nova.criteriosDeAceite.length === 0) problemas.push("Falta ao menos um critério de aceite.");
  return problemas;
}
