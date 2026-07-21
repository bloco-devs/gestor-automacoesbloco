import { useEffect, useState } from "react";
import { knowledgeService } from "../services/knowledge-service";
import type { KnowledgeItem } from "../types";

interface Options {
  /** Só busca a partir deste tamanho de texto. */
  minChars?: number;
  /** Debounce em ms. */
  delay?: number;
  /** Desliga temporariamente (ex.: durante submit). */
  enabled?: boolean;
}

interface State {
  items: KnowledgeItem[];
  loading: boolean;
}

/**
 * Busca discreta de conteúdo relevante enquanto o usuário digita.
 * Combina artigos e solicitações semelhantes através do `knowledgeService`.
 */
export function useKnowledgeSuggestions(text: string, opts: Options = {}): State {
  const { minChars = 20, delay = 700, enabled = true } = opts;
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = text.trim();
    if (!enabled || q.length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const results = await knowledgeService.search(q);
      if (cancelled) return;
      setItems(results);
      setLoading(false);
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text, minChars, delay, enabled]);

  return { items, loading };
}
