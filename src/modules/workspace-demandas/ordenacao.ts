/**
 * A matemática de posição de uma lista arrastável.
 *
 * Módulo puro de propósito: quem calcula onde o cartão cai não deve conhecer
 * dnd-kit, React ou Supabase. Assim a regra pode ser testada sem tela — e é o
 * único lugar onde a conta existe, tanto no quadro quanto nas caixas de
 * entrada.
 */
import { arrayMove } from "@dnd-kit/sortable";

/** Uma posição gravável: o id da linha e o índice que ela passa a ocupar. */
export interface PosicaoNaFila {
  id: string;
  ordem: number;
}

/**
 * Move `ativo` para a posição de `sobre`, devolvendo a sequência final de ids.
 *
 * Tolerante por contrato: se qualquer um dos dois não estiver na lista, a lista
 * volta intacta em vez de o `splice` inserir de trás para frente (que é o que
 * um `indexOf` devolvendo -1 provoca).
 */
export function reordenarLista(ids: string[], ativo: string, sobre: string): string[] {
  if (ativo === sobre) return ids;
  const oldIndex = ids.indexOf(ativo);
  const newIndex = ids.indexOf(sobre);
  if (oldIndex < 0 || newIndex < 0) return ids;
  return arrayMove(ids, oldIndex, newIndex);
}

/**
 * Insere `ativo` numa outra coluna, antes de `sobre`.
 *
 * `sobre` nulo (soltou no corpo da coluna, não sobre um cartão) significa fim
 * da fila — é o comportamento que a pessoa espera quando solta no vazio.
 */
export function inserirNaLista(ids: string[], ativo: string, sobre: string | null): string[] {
  const sem = ids.filter((id) => id !== ativo);
  const pos = sobre ? sem.indexOf(sobre) : sem.length;
  const destino = pos < 0 ? sem.length : pos;
  const out = [...sem];
  out.splice(destino, 0, ativo);
  return out;
}

/**
 * Traduz uma sequência de ids em posições densas (0..n-1).
 *
 * Densas, e não relativas, porque posição relativa gera empate: dois itens com
 * a mesma `ordem` deixam o desempate para o banco, e a fila muda de aparência
 * a cada recarga. Reescrever a coluna inteira torna a ordem um fato.
 */
export function ordensDaLista(ids: string[]): PosicaoNaFila[] {
  return ids.map((id, ordem) => ({ id, ordem }));
}

/**
 * Ordena por ordem manual, com quem nunca foi arrastado no fim.
 *
 * O critério automático continua valendo entre os não posicionados — a ordem
 * manual SOBREPÕE, não substitui. `comparadorBase` é o critério da fila (score,
 * SLA, chegada) e só é consultado quando nenhum dos dois foi posicionado à mão.
 *
 * Puro de propósito: a Caixa de Entrada usa isto dentro do motor de prioridade,
 * que não conhece Supabase.
 */
export function ordenarPorOrdemManual<T>(
  itens: readonly T[],
  ordemDe: (item: T) => number | null | undefined,
  comparadorBase?: (a: T, b: T) => number,
): T[] {
  return [...itens].sort((a, b) => {
    const oa = ordemDe(a);
    const ob = ordemDe(b);
    const temA = oa !== null && oa !== undefined;
    const temB = ob !== null && ob !== undefined;
    if (temA && temB && oa !== ob) return (oa as number) - (ob as number);
    if (temA && !temB) return -1;
    if (!temA && temB) return 1;
    return comparadorBase ? comparadorBase(a, b) : 0;
  });
}
