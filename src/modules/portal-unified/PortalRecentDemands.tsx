import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDemands } from "@/modules/demands/hooks";
import type { Demand } from "@/modules/demands/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { visivelParaOSolicitante } from "@/modules/demands/janelaDeVisibilidade";
import { humanizeStatus, humanTime } from "./statusHuman";

export function PortalRecentDemands({ limit = 3 }: { limit?: number }) {
  const { user } = useAuth();
  const { data: demands = [], isLoading } = useDemands();

  const mine = useMemo<Demand[]>(() => {
    if (!user?.id) return [];
    return demands
      .filter((d) => d.created_by === user.id)
      // Concluída sai da lista depois de alguns dias úteis. Ela continua
      // existindo em "Ver todas" e na busca — a lista responde "o que eu pedi
      // e ainda não chegou", e trabalho terminado não responde isso.
      .filter((d) => visivelParaOSolicitante(d))
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
  }, [demands, user?.id, limit]);

  return (
    <section aria-label="Minhas Demandas" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Minhas Demandas</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/demandas">
            Ver todas <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : mine.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Você ainda não abriu nenhuma demanda.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {mine.map((d) => {
            const s = humanizeStatus(d.status);
            return (
              <li key={d.id}>
                {/* Estas linhas vêm de `useDemands` (tabela `demands`), mas
                    apontavam para /solicitacao/:id — a tela do fluxo antigo,
                    que consulta a tabela `solicitacoes`. Com um id de
                    `demands` a busca não achava nada e o solicitante via
                    "Solicitação não encontrada" ao clicar na própria demanda.
                    O destino certo é a página da demanda. */}
                <Link
                  to={`/demandas/${d.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-muted/50"
                >
                  <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.label} · {humanTime(d.updated_at)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
