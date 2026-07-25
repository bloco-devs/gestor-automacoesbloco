import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import { useDemands } from "@/modules/demands/hooks";
import { STATUS_COLUMNS, type Demand } from "@/modules/demands/types";
import { SLAIndicator } from "@/modules/demands/components/SLAIndicator";
import { NewTicketDialog } from "./NewTicketDialog";
import { RequestDetailModal } from "./RequestDetailModal";
import { EmptyState } from "@/components/EmptyState";

interface QuickArticle {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string | null;
  url_externa: string | null;
}

async function fetchQuickArticles(): Promise<QuickArticle[]> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id, titulo, resumo, categoria, url_externa, updated_at")
    .eq("status", "publicado")
    .order("updated_at", { ascending: false })
    .limit(6);
  if (error) return [];
  return (data ?? []) as QuickArticle[];
}

export default function PortalIndex() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Demand | null>(null);

  const { data: demands = [], isLoading: loadingDemands } = useDemands();
  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["portal-quick-articles"],
    queryFn: fetchQuickArticles,
    staleTime: 5 * 60 * 1000,
  });

  // Por RLS, `useDemands` já retorna apenas as demandas visíveis ao usuário.
  // Ainda assim filtramos por `created_by` para segurança em profundidade
  // (caso o usuário seja parte da equipe e também tenha demandas atribuídas).
  const myRequests = useMemo(() => {
    if (!user?.id) return [] as Demand[];
    return demands.filter((d) => d.created_by === user.id).slice(0, 20);
  }, [demands, user?.id]);

  const nome = (user?.nome ?? "").split(" ")[0];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-6 sm:py-10">
      {/* Hero */}
      <header className="space-y-3 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {nome ? `Olá, ${nome}!` : "Olá!"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Como podemos te ajudar hoje?
        </h1>
        <p className="text-sm text-muted-foreground">
          Busque uma solução na nossa base ou abra uma demanda.
        </p>

        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="size-4 ml-2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex.: erro ao entrar no sistema, solicitar acesso…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Buscar na base de conhecimento"
          />
          <Button onClick={() => setNewOpen(true)} className="rounded-xl gap-1.5 shrink-0">
            <Plus className="size-4" /> Nova demanda
          </Button>
        </div>

        {query.length >= 20 && (
          <div className="mx-auto max-w-2xl text-left">
            <KnowledgeSuggestions query={query} origin="portal" minChars={20} />
          </div>
        )}
      </header>

      {/* Artigos em destaque */}
      <section aria-labelledby="kb-quick">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" />
          <h2 id="kb-quick" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Base de conhecimento
          </h2>
        </div>
        {loadingArticles ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum artigo publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {articles.map((a) => {
              const href = a.url_externa ? a.url_externa : `/ajuda?artigo=${a.id}`;
              const external = !!a.url_externa;
              return (
                <a
                  key={a.id}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="group rounded-lg border border-border/60 bg-card p-3 hover:border-border hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="size-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight group-hover:underline underline-offset-2 line-clamp-2">
                        {a.titulo}
                      </p>
                      {a.resumo && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.resumo}</p>
                      )}
                      {a.categoria && (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {a.categoria}
                        </Badge>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* Minhas solicitações */}
      <section aria-labelledby="my-requests">
        <div className="mb-3 flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <h2 id="my-requests" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Minhas demandas
          </h2>
        </div>

        {loadingDemands ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : myRequests.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Você ainda não abriu nenhuma demanda"
            description="Clique em “Nova demanda” acima para registrar a primeira."
          />
        ) : (
          <ul className="space-y-2">
            {myRequests.map((d) => {
              const status = STATUS_COLUMNS.find((s) => s.id === d.status);
              return (
                <li key={d.id}>
                  <Card
                    className="cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => setSelected(d)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.title}</p>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {status?.label ?? d.status}
                          </Badge>
                          <SLAIndicator
                            slaDueAt={d.sla_due_at}
                            slaStatus={d.sla_status}
                            demandStatus={d.status}
                            createdAt={d.created_at}
                            size="sm"
                          />
                          <span className="text-xs text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <NewTicketDialog open={newOpen} onOpenChange={setNewOpen} />
      <RequestDetailModal
        demand={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
