/**
 * scoreV2 — nova fórmula de priorização (escala 0-10 nos fatores, 0-100 no score).
 *
 * IMPORTANTE: estas funções ESPELHAM a função SQL `compute_scores()` (a ser criada
 * no backend em migration futura). Enquanto o trigger SQL não existir, o cálculo
 * é feito client-side. APÓS o trigger ser criado, estas funções serão removidas
 * e substituídas por uma chamada RPC ao Postgres (single source of truth).
 *
 * Pesos: fixos em 1/3 para cada fator do solicitante (frequência, dificuldade, retorno).
 * Penalização técnica: linear — cada ponto de complexidade do dev reduz 10% do score.
 */

/**
 * Score parcial do solicitante (0-100).
 * Fórmula: média dos 3 fatores (escala 0-10) projetada em 0-100.
 *
 * Equivalente: ((f + d + r) / 30) * 100  ou  ((f + d + r) / 3) * 10.
 *
 * Ex.: computeScoreSolicitante(8, 7, 6) = ((8+7+6)/30)*100 = 70.
 */
export function computeScoreSolicitante(
  frequencia: number,
  dificuldade: number,
  retorno: number,
): number {
  const sum = clamp10(frequencia) + clamp10(dificuldade) + clamp10(retorno);
  return (sum / 30) * 100;
}

/**
 * Score final (0-100) com penalização pela complexidade técnica avaliada pelo dev.
 * Retorna NULL enquanto o dev não tiver avaliado (`complexidadeDev === null`).
 *
 * Fórmula: scoreSolicitante * ((10 - complexidadeDev) / 10).
 *
 * Ex.: computeScoreFinal(70, 3) = 70 * 0.7 = 49.
 */
export function computeScoreFinal(
  scoreSolicitante: number,
  complexidadeDev: number | null,
): number | null {
  if (complexidadeDev === null || complexidadeDev === undefined) return null;
  const c = clamp10(complexidadeDev);
  return scoreSolicitante * ((10 - c) / 10);
}

/**
 * Tom visual para badges/pills de score.
 * Cortes provisórios — serão recalibrados em produção com percentis reais.
 */
export function scoreTone(
  score: number | null,
  // variant reservado para futura diferenciação visual entre solicitante x final.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant: "solicitante" | "final",
): "high" | "mid" | "low" {
  if (score === null || score === undefined) return "low";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

function clamp10(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(10, v));
}
