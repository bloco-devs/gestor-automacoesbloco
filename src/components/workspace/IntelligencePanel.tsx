import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, Bot, Sparkles, UserPlus, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAssignDemand } from "@/modules/demands/hooks";
import type { Demand } from "@/modules/demands/types";
import { useRoutingSuggestions, RoutingSuggestionCard } from "@/modules/routing";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import { useToast } from "@/hooks/use-toast";

interface Props {
  demand: Demand | null;
}

export const IntelligencePanel = memo(function IntelligencePanel({ demand }: Props) {
  const { toast } = useToast();
  const assign = useAssignDemand();

  const routing = useRoutingSuggestions(
    demand
      ? {
          type: demand.type,
          priority: demand.priority,
          complexity: demand.complexity,
          sla_status: demand.sla_status,
          system_slug: demand.system_id, // F018.4 — habilita afinidade por sistema
        }
      : null,
  );

  const kbQuery = useMemo(() => {
    if (!demand) return "";
    return [demand.title, demand.description ?? ""].join(" ").trim();
  }, [demand]);

  if (!demand) {
    return (
      <aside className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        <Sparkles className="mb-2 size-6 opacity-50" />
        A IA aparecerá aqui quando você selecionar uma demanda.
      </aside>
    );
  }

  const handleAssign = async (userId: string) => {
    try {
      await assign.mutateAsync({ id: demand.id, assigned_to: userId });
      toast({ title: "Responsável atribuído" });
    } catch (e) {
      toast({
        title: "Erro ao atribuir",
        description: e instanceof Error ? e.message : "Falha",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-card/40">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> Painel Inteligente
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Contexto, sugestões e roteamento para esta demanda.
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {demand.ai_auto_responded && (
          <section>
            <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Bot className="size-3.5" /> Agente IA Nível 1
            </h3>
            <Card className="p-3 text-xs text-muted-foreground">
              Resposta automática publicada por IA
              {demand.ai_confidence_score != null && (
                <> · confiança {Math.round(Number(demand.ai_confidence_score) * 100)}%</>
              )}
              .
            </Card>
          </section>
        )}

        <section>
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UserPlus className="size-3.5" /> Smart Routing
          </h3>
          {demand.assigned_to ? (
            <Card className="p-3 text-xs text-muted-foreground">
              Demanda já atribuída. Reabra a atribuição em "Detalhes completos".
            </Card>
          ) : routing.isLoading ? (
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Analisando candidatos…
            </div>
          ) : (
            <RoutingSuggestionCard
              ranking={routing.ranking}
              onAssign={handleAssign}
              isAssigning={assign.isPending}
              systemSlug={demand.system_id}
            />
          )}
        </section>

        <Separator />

        <section>
          <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" /> Conhecimento relacionado
          </h3>
          <KnowledgeSuggestions query={kbQuery} origin="ai_workspace" minChars={12} />
        </section>

        <Separator />

        <section className="space-y-2">
          <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Activity className="size-3.5" /> Observabilidade
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">
              Complexidade: {demand.complexity}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Score: {demand.ai_confidence_score ? Math.round(Number(demand.ai_confidence_score) * 100) + "%" : "—"}
            </Badge>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
            <Link to="/observabilidade-ia">Abrir Observabilidade IA →</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
            <Link to="/admin/workflows/execucoes">Execuções de Workflow →</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 w-full justify-start text-xs">
            <Link to="/operacoes">Centro de Operações →</Link>
          </Button>
        </section>
      </div>
    </aside>
  );
});
