import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolicitacoes, listSolucoes } from "@/lib/supabaseData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEM_SOLICITACAO_KEY = "__sem__";

export default function SolucoesKanban() {
  const navigate = useNavigate();
  const solucoes = useSupabaseData(() => listSolucoes(), []);
  const solicitacoes = useSupabaseData(() => listSolicitacoes(), []);

  const solicitacoesMap = useMemo(() => {
    const m = new Map(solicitacoes.map((s) => [s.id, s]));
    return m;
  }, [solicitacoes]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof solucoes>();
    for (const sol of solucoes) {
      const key = sol.solicitacaoId ?? SEM_SOLICITACAO_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sol);
    }
    // Order: solicitações com soluções primeiro (por created_at desc), "sem" no fim
    const orderedKeys = Array.from(map.keys()).sort((a, b) => {
      if (a === SEM_SOLICITACAO_KEY) return 1;
      if (b === SEM_SOLICITACAO_KEY) return -1;
      const sa = solicitacoesMap.get(a);
      const sb = solicitacoesMap.get(b);
      const ta = sa ? new Date(sa.createdAt).getTime() : 0;
      const tb = sb ? new Date(sb.createdAt).getTime() : 0;
      return tb - ta;
    });
    return orderedKeys.map((k) => ({ key: k, items: map.get(k)! }));
  }, [solucoes, solicitacoesMap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kanban de Soluções</h1>
        <p className="text-sm text-muted-foreground">
          Soluções agrupadas pela solicitação que as originou.
        </p>
      </div>

      {grouped.length === 0 ? (
        <Card className="surface-1">
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            Nenhuma solução cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {grouped.map(({ key, items }) => {
            const solic = key === SEM_SOLICITACAO_KEY ? null : solicitacoesMap.get(key);
            const title = solic?.titulo ?? "Sem solicitação vinculada";
            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border bg-card p-3 flex flex-col min-h-[200px]",
                  key === SEM_SOLICITACAO_KEY ? "border-dashed border-muted" : "border-border",
                )}
              >
                <div className="mb-3 px-1">
                  <button
                    type="button"
                    onClick={() => solic && navigate(`/solicitacao/${solic.id}`)}
                    disabled={!solic}
                    className={cn(
                      "block w-full text-left text-sm font-medium leading-snug truncate",
                      solic && "hover:text-accent",
                    )}
                  >
                    {title}
                  </button>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {items.length} solução{items.length === 1 ? "" : "ões"}
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {items.map((sol) => (
                    <div
                      key={sol.id}
                      onClick={() => navigate(`/solucoes/${sol.id}`)}
                      className="rounded-md border border-border bg-background p-3 cursor-pointer transition-shadow hover:border-accent/50 hover:shadow-sm"
                    >
                      <div className="text-sm font-medium leading-snug line-clamp-2">{sol.titulo}</div>
                      {sol.descricao && (
                        <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {sol.descricao}
                        </div>
                      )}
                      {sol.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(sol.link!, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="size-3 mr-1" />
                          Abrir link
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
