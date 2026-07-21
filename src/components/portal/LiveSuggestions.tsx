import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Similar {
  id: string;
  titulo: string;
  similaridade: number;
  motivo: string;
}

interface Props {
  text: string;
  /** Só busca a partir deste tamanho para não incomodar. */
  minChars?: number;
  /** Debounce em ms. */
  delay?: number;
}

/**
 * Busca discreta de solicitações parecidas enquanto o solicitante digita.
 * Reutiliza a Edge Function `demandas-similares` — nenhum backend novo.
 */
export const LiveSuggestions = memo(function LiveSuggestions({
  text,
  minChars = 25,
  delay = 700,
}: Props) {
  const [items, setItems] = useState<Similar[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < minChars) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("demandas-similares", {
          body: { titulo: trimmed.slice(0, 80), descricao: trimmed },
        });
        if (cancelled) return;
        if (error) {
          setItems([]);
        } else {
          const list = (data as { similares?: Similar[] } | null)?.similares ?? [];
          setItems(list);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [text, minChars, delay]);

  if (!loading && items.length === 0) return null;

  return (
    <aside
      aria-label="Sugestões relacionadas"
      className="rounded-2xl border border-border/70 bg-muted/40 p-4"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        <Lightbulb className="size-4 text-amber-500" />
        {loading && items.length === 0
          ? "Procurando algo parecido…"
          : "Talvez isso já resolva seu problema"}
        {loading && items.length > 0 && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <Link
              to={`/solicitacao/${it.id}`}
              className="block rounded-lg border border-transparent bg-background/60 p-3 text-sm transition hover:border-border hover:bg-background"
            >
              <div className="font-medium text-foreground">{it.titulo}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{it.motivo}</div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
});
