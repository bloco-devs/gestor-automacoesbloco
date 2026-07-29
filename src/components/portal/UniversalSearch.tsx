import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MessageSquare, BookOpen, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDemands } from "@/modules/demands/hooks";
import { STATUS_COLUMNS } from "@/modules/demands/types";

interface ArticleHit {
  id: string;
  titulo: string;
  categoria: string | null;
}

/**
 * Busca universal do Portal — pesquisa chamados do usuário (locais)
 * + artigos publicados (Supabase), sem endpoint novo.
 */
export function UniversalSearch({ onPick }: { onPick?: () => void }) {
  const [q, setQ] = useState("");
  const [articles, setArticles] = useState<ArticleHit[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: demands = [] } = useDemands();

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setArticles([]);
      return;
    }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("knowledge_articles")
        .select("id, titulo, categoria")
        .eq("status", "publicado")
        .ilike("titulo", `%${s}%`)
        .limit(5);
      if (!cancel) setArticles((data as ArticleHit[]) ?? []);
    }, 200);
    return () => {
      cancel = true;
      clearTimeout(t);
    };
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const chamados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return demands
      .filter(
        (d) =>
          d.title.toLowerCase().includes(s) ||
          (d.description ?? "").toLowerCase().includes(s),
      )
      .slice(0, 5);
  }, [demands, q]);

  const hasResults = chamados.length > 0 || articles.length > 0;
  const showResults = open && q.trim().length >= 2;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 shadow-sm backdrop-blur transition focus-within:border-primary/50 focus-within:shadow-elev-1">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar chamados, artigos, mensagens…"
          aria-label="Busca universal"
          className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Limpar"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 animate-fade-in rounded-2xl border border-border bg-popover p-2 shadow-elev-2">
          {!hasResults && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nada por aqui — que tal descrever no chat acima?
            </p>
          )}
          {chamados.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Chamados
              </p>
              <ul>
                {chamados.map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/portal/demandas"
                      onClick={() => {
                        setOpen(false);
                        onPick?.();
                      }}
                      className="flex items-start gap-3 rounded-xl px-3 py-2 transition hover:bg-muted"
                    >
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {STATUS_COLUMNS.find((s) => s.id === d.status)?.label ??
                            d.status}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {articles.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Artigos
              </p>
              <ul>
                {articles.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={`/ajuda?artigo=${a.id}`}
                      onClick={() => {
                        setOpen(false);
                        onPick?.();
                      }}
                      className="flex items-start gap-3 rounded-xl px-3 py-2 transition hover:bg-muted"
                    >
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{a.titulo}</p>
                        {a.categoria && (
                          <p className="text-xs text-muted-foreground">{a.categoria}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
