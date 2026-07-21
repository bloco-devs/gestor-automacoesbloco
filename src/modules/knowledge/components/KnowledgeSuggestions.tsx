import { memo, useCallback, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKnowledgeSuggestions } from "../hooks/useKnowledgeSuggestions";
import { knowledgeService } from "../services/knowledge-service";
import type { KnowledgeItem, KnowledgeOrigin } from "../types";
import { KnowledgeItemCard } from "./KnowledgeItemCard";

interface Props {
  /** Texto que o usuário está escrevendo. */
  query: string;
  /** Origem do evento — usada para métricas (`portal` ou `ai_workspace`). */
  origin: KnowledgeOrigin;
  /**
   * Chamado quando o usuário afirma que o problema foi resolvido pelo
   * conteúdo sugerido. Pode ser usado para encerrar o fluxo sem abrir
   * solicitação (ex.: reset do AI Workspace, redirect no Portal).
   */
  onResolved?: (item: KnowledgeItem | null) => void;
  minChars?: number;
  enabled?: boolean;
}

/**
 * Central Inteligente de Soluções — sugestões passivas com feedback.
 *
 * - Não interrompe: só aparece quando há resultados relevantes.
 * - Reusa `demandas-similares` (edge function) + RPC `knowledge_search`.
 * - Registra métricas em `knowledge_feedback` (base do dashboard de
 *   "solicitações evitadas").
 */
export const KnowledgeSuggestions = memo(function KnowledgeSuggestions({
  query,
  origin,
  onResolved,
  minChars = 20,
  enabled = true,
}: Props) {
  const { items, loading } = useKnowledgeSuggestions(query, { minChars, enabled });
  const [choice, setChoice] = useState<"resolved" | "not_helpful" | null>(null);
  const [lastOpened, setLastOpened] = useState<KnowledgeItem | null>(null);

  const handleOpen = useCallback((item: KnowledgeItem) => {
    setLastOpened(item);
  }, []);

  const handleResolved = useCallback(async () => {
    setChoice("resolved");
    await knowledgeService.recordFeedback({
      articleId: lastOpened?.source === "article" ? lastOpened.id : null,
      demandaSimilarId: lastOpened?.source === "similar_demand" ? lastOpened.id : null,
      queryText: query,
      resolved: true,
      origem: origin,
    });
    onResolved?.(lastOpened);
  }, [lastOpened, query, origin, onResolved]);

  const handleNotHelpful = useCallback(async () => {
    setChoice("not_helpful");
    await knowledgeService.recordFeedback({
      articleId: lastOpened?.source === "article" ? lastOpened.id : null,
      demandaSimilarId: lastOpened?.source === "similar_demand" ? lastOpened.id : null,
      queryText: query,
      resolved: false,
      origem: origin,
    });
  }, [lastOpened, query, origin]);

  if (!enabled) return null;
  if (!loading && items.length === 0 && choice === null) return null;

  if (choice === "resolved") {
    return (
      <aside
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300"
      >
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4" /> Que ótimo!
        </div>
        <p className="mt-1 text-emerald-700/80 dark:text-emerald-300/80">
          Ficamos felizes em ajudar. Você não precisa abrir uma solicitação.
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Sugestões relacionadas"
      className="rounded-2xl border border-border/70 bg-muted/40 p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Lightbulb className="size-4 text-amber-500" />
        {loading && items.length === 0
          ? "Procurando algo parecido…"
          : "Talvez alguma dessas soluções resolva seu problema"}
        {loading && items.length > 0 && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={`${it.source}-${it.id}`}>
            <KnowledgeItemCard item={it} onOpen={handleOpen} />
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">Isso resolveu seu problema?</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleResolved}
            aria-label="Meu problema foi resolvido"
          >
            <CheckCircle2 className="mr-1 size-3.5" /> Resolveu
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleNotHelpful}
            disabled={choice === "not_helpful"}
            aria-label="Ainda preciso de ajuda"
          >
            <ThumbsDown className="mr-1 size-3.5" /> Ainda preciso de ajuda
          </Button>
        </div>
      )}
    </aside>
  );
});
