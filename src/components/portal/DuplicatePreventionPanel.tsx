import { memo, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  ExternalLink,
  Lightbulb,
  Loader2,
  Sparkles,
  TicketCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { useKnowledgeSuggestions } from "@/modules/knowledge";
import type { KnowledgeItem } from "@/modules/knowledge";
import {
  useEcossistemaMatch,
  trackDuplicatePrevention,
  type EcossistemaCandidato,
} from "@/modules/ecossistema";
import { useContextActions } from "@/modules/context";

interface Props {
  titulo: string;
  descricao: string;
  sistemaAlvoSlug?: string | null;
  enabled?: boolean;
  onContinueAnyway: () => void;
  onResolved?: () => void;
}

/**
 * Painel intermediário de Prevenção de Duplicatas.
 *
 * Consulta em paralelo:
 *   - `match-ecossistema` (sistemas do ecossistema que já resolvem a demanda)
 *   - `knowledge_search` + `demandas-similares` (via useKnowledgeSuggestions)
 *
 * Não renderiza nada quando não há sugestões — o fluxo original segue igual.
 */
export const DuplicatePreventionPanel = memo(function DuplicatePreventionPanel({
  titulo,
  descricao,
  sistemaAlvoSlug = null,
  enabled = true,
  onContinueAnyway,
  onResolved,
}: Props) {
  const { patch } = useContextActions();
  const query = useMemo(
    () => [titulo, descricao].filter(Boolean).join(" — ").trim(),
    [titulo, descricao],
  );

  const eco = useEcossistemaMatch(titulo, descricao, {
    enabled,
    sistemaAlvoSlug,
    minChars: 30,
    delay: 500,
  });
  const kb = useKnowledgeSuggestions(query, { enabled, minChars: 25, delay: 500 });

  const chamados = kb.items.filter((i) => i.source === "similar_demand");
  const artigos = kb.items.filter((i) => i.source === "article");
  const sistemas = eco.candidatos;

  const totalSuggestions = sistemas.length + chamados.length + artigos.length;
  const isLoading = eco.loading || kb.loading;

  // Enriquecimento do Context Engine + evento de view (uma vez por batch de sugestões).
  useEffect(() => {
    if (totalSuggestions === 0) return;
    trackDuplicatePrevention("duplicate_prevention_view");
    const primeiro = sistemas[0];
    if (primeiro) {
      patch({
        entityType: "sistema",
        entityId: primeiro.sistema_slug,
        metadata: {
          ecossistemaMatch: {
            similarity: primeiro.confianca,
            origin: "portal.duplicate-prevention",
            slug: primeiro.sistema_slug,
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSuggestions]);

  if (!enabled) return null;
  if (isLoading && totalSuggestions === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verificando se algo parecido já existe…
      </div>
    );
  }
  if (totalSuggestions === 0) return null;

  const handleContinue = () => {
    trackDuplicatePrevention("duplicate_prevention_continue");
    onContinueAnyway();
  };

  return (
    <section
      aria-label="Sugestões inteligentes antes de abrir chamado"
      className="space-y-5 rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 to-background p-5 sm:p-6"
    >
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold tracking-tight">Encontramos algo parecido</h3>
            <p className="text-sm text-muted-foreground">
              Solicitações, artigos ou sistemas que podem resolver seu problema agora mesmo.
            </p>
          </div>
          <DataSourceBadge variant="match-ia" />
        </div>
      </header>

      {/* 1. Chamados ativos */}
      {chamados.length > 0 && (
        <SuggestionGroup
          icon={<TicketCheck className="size-4" />}
          title="Chamados ativos semelhantes"
          count={chamados.length}
        >
          <div className="space-y-2">
            {chamados.map((it) => (
              <KbCard key={`chamado-${it.id}`} item={it} kind="ticket" onOpen={onResolved} />
            ))}
          </div>
        </SuggestionGroup>
      )}

      {/* 2. Artigos */}
      {artigos.length > 0 && (
        <SuggestionGroup
          icon={<BookOpen className="size-4" />}
          title="Artigos da base de conhecimento"
          count={artigos.length}
        >
          <div className="space-y-2">
            {artigos.map((it) => (
              <KbCard key={`artigo-${it.id}`} item={it} kind="article" onOpen={onResolved} />
            ))}
          </div>
        </SuggestionGroup>
      )}

      {/* 3. Sistemas do ecossistema */}
      {sistemas.length > 0 && (
        <SuggestionGroup
          icon={<Boxes className="size-4" />}
          title="Sistemas que já fazem isso"
          count={sistemas.length}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {sistemas.map((c) => (
              <SistemaCard key={c.sistema_slug} candidato={c} />
            ))}
          </div>
        </SuggestionGroup>
      )}

      {/* Rodapé — Continuar mesmo assim */}
      <footer className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-amber-500" />
          Reaproveitar reduz retrabalho e acelera sua entrega.
        </p>
        <Button variant="outline" size="sm" onClick={handleContinue} className="rounded-xl">
          Continuar mesmo assim
          <ArrowUpRight className="ml-1 size-3.5" />
        </Button>
      </footer>
    </section>
  );
});

interface GroupProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}
function SuggestionGroup({ icon, title, count, children }: GroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="text-muted-foreground">{icon}</span>
        {title}
        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function SimilarityBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary/70 transition-all"
          style={{ width: `${v}%` }}
        />
      </div>
      <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{v}%</span>
    </div>
  );
}

function KbCard({
  item,
  kind,
  onOpen,
}: {
  item: KnowledgeItem;
  kind: "article" | "ticket";
  onOpen?: () => void;
}) {
  const handleClick = () => {
    trackDuplicatePrevention(
      kind === "article" ? "duplicate_prevention_open_article" : "duplicate_prevention_open_ticket",
    );
    onOpen?.();
  };
  const external = item.urlExterna && kind === "article";
  return (
    <Card className="group border-border/70 transition hover:border-primary/40 hover:shadow-sm">
      <CardContent className="p-3.5">
        <Link
          to={external ? "" : item.href}
          {...(external ? { as: "a", href: item.urlExterna ?? "#", target: "_blank", rel: "noreferrer" } : {})}
          onClick={handleClick}
          className="block"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="line-clamp-1 text-sm font-medium">{item.titulo}</div>
              {item.resumo && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{item.resumo}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {item.categoria && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {item.categoria}
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-24 shrink-0 space-y-1.5">
              <SimilarityBar value={item.relevancia} />
              <div className="text-right text-[10px] font-medium text-primary opacity-0 transition group-hover:opacity-100">
                {kind === "article" ? "Ler artigo" : "Acompanhar"}
                <ExternalLink className="ml-0.5 inline size-3" />
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function SistemaCard({ candidato }: { candidato: EcossistemaCandidato }) {
  const handleClick = () => trackDuplicatePrevention("duplicate_prevention_open_system");
  const inner = (
    <CardContent className="p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="line-clamp-1 text-sm font-medium">{candidato.nome}</div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{candidato.justificativa}</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {candidato.modulo && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {candidato.modulo}
              </Badge>
            )}
          </div>
        </div>
        <div className="w-20 shrink-0 space-y-1.5">
          <SimilarityBar value={candidato.confianca} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-medium text-primary">
        Ver sistema <ArrowUpRight className="size-3" />
      </div>
    </CardContent>
  );

  const external = candidato.url_app;
  return (
    <Card className="group border-border/70 transition hover:border-primary/40 hover:shadow-sm">
      {external ? (
        <a href={external} target="_blank" rel="noreferrer" onClick={handleClick} className="block">
          {inner}
        </a>
      ) : (
        <Link to={`/ecossistema/${candidato.sistema_slug}`} onClick={handleClick} className="block">
          {inner}
        </Link>
      )}
    </Card>
  );
}
