import type { Solicitacao } from "./types";

/**
 * Score simples — média normalizada 0-100 dos 4 fatores.
 * Frequência (1-4) e demais (1-5). Dificuldade é invertida (mais fácil = maior score).
 */
export function calcScore(input: {
  frequencia: number;
  complexidade: number;
  retorno: number;
  dificuldade: number;
}): number {
  const freqNorm = (input.frequencia / 4) * 100;
  const complexNorm = (input.complexidade / 5) * 100;
  const retornoNorm = (input.retorno / 5) * 100;
  const dificuldadeInv = ((6 - input.dificuldade) / 5) * 100;
  const media = (freqNorm + complexNorm + retornoNorm + dificuldadeInv) / 4;
  return Math.round(media);
}

export function scoreTone(score: number): "high" | "mid" | "low" {
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function recompute(s: Solicitacao): Solicitacao {
  return { ...s, score: calcScore(s), updatedAt: new Date().toISOString() };
}
