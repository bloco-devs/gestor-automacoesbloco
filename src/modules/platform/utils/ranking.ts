import type { RankedResult } from "../types";

export interface Rankable {
  title: string;
  description?: string;
  keywords?: string[];
  category?: string;
  id: string;
}

export interface RankOptions {
  /** IDs recentemente usados (ordem desc de recência). */
  recentIds?: string[];
  /** Ponderações ajustáveis. */
  weights?: {
    exactTitle?: number;
    prefixTitle?: number;
    partialTitle?: number;
    keyword?: number;
    category?: number;
    description?: number;
    recent?: number;
  };
}

const DEFAULT_WEIGHTS = {
  exactTitle: 100,
  prefixTitle: 60,
  partialTitle: 30,
  keyword: 25,
  category: 15,
  description: 10,
  recent: 20,
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Ranking heurístico local, sem dependências externas. */
export function rank<T extends Rankable>(
  items: T[],
  query: string,
  options: RankOptions = {},
): RankedResult<T>[] {
  const q = normalize(query);
  const w = { ...DEFAULT_WEIGHTS, ...(options.weights ?? {}) };
  const recent = new Map<string, number>();
  (options.recentIds ?? []).forEach((id, idx, arr) => {
    // recência decrescente: 1.0 para o mais recente, decai linearmente
    recent.set(id, (arr.length - idx) / arr.length);
  });

  const results: RankedResult<T>[] = [];

  for (const item of items) {
    const reasons: string[] = [];
    let score = 0;
    const title = normalize(item.title);
    const desc = normalize(item.description ?? "");
    const cat = normalize(item.category ?? "");
    const kws = (item.keywords ?? []).map(normalize);

    if (!q) {
      // Sem query: usa recência apenas
      const r = recent.get(item.id) ?? 0;
      if (r > 0) {
        score = r * w.recent;
        reasons.push("recente");
      }
    } else {
      if (title === q) {
        score += w.exactTitle;
        reasons.push("título exato");
      } else if (title.startsWith(q)) {
        score += w.prefixTitle;
        reasons.push("prefixo");
      } else if (title.includes(q)) {
        score += w.partialTitle;
        reasons.push("parcial");
      }
      if (kws.some((k) => k === q || k.includes(q))) {
        score += w.keyword;
        reasons.push("keyword");
      }
      if (cat && cat.includes(q)) {
        score += w.category;
        reasons.push("categoria");
      }
      if (desc && desc.includes(q)) {
        score += w.description;
        reasons.push("descrição");
      }
      const r = recent.get(item.id) ?? 0;
      if (r > 0 && score > 0) {
        score += r * w.recent;
        reasons.push("recente");
      }
    }

    if (score > 0 || !q) results.push({ item, score, reasons });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}
