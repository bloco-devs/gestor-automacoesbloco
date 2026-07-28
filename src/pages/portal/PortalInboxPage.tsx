import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import { PortalShell } from "@/modules/portal-unified";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from "@/modules/notifications";
import type { AppNotification } from "@/modules/notifications/service";

/**
 * Inbox do Solicitante — SOMENTE comunicação.
 * Nada de tarefas, KPIs, prioridades, IA, backlog ou cards.
 *
 * O QUE ESTA TELA ERA ATÉ AQUI
 * Um texto fixo dizendo "Nada novo por aqui" — sempre, para todo mundo. Ela
 * nunca leu a tabela de notificações. Ou seja: no mesmo período em que o
 * sistema passou a avisar o solicitante que alguém assumiu a demanda dele, a
 * tela criada justamente para mostrar esses avisos garantia que ele não os
 * veria. Um vazio que mente é pior que uma tela ausente: quem confia nele
 * conclui que ninguém mexeu no pedido.
 *
 * Agora lê as notificações de verdade, pelo mesmo hook que o sino do topo já
 * usa — uma fonte só, sem chance de as duas discordarem.
 */

function quandoFoi(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function PortalInboxPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const marcarUma = useMarkNotificationRead();
  const marcarTodas = useMarkAllRead();

  const lista = useMemo(() => data ?? [], [data]);
  const naoLidas = useMemo(() => lista.filter((n) => !n.read).length, [lista]);

  function abrir(n: AppNotification) {
    if (!n.read) marcarUma.mutate(n.id);
    if (n.link_url) navigate(n.link_url);
  }

  return (
    <PortalShell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Notificações, comentários, menções e aprovações relacionados às suas demandas.
          </p>
        </div>
        {naoLidas > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => marcarTodas.mutate()}
            disabled={marcarTodas.isPending}
            className="gap-1.5"
          >
            <Check className="size-3.5" aria-hidden />
            Marcar todas como lidas
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted">
            <Bell className="size-4" aria-hidden />
          </span>
          <p className="text-sm font-medium">Nada novo por aqui.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Quando alguém comentar, mencionar você ou responder uma demanda, o aviso aparece nesta
            lista.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {lista.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => abrir(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  "hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/60",
                  !n.read && "bg-muted/25",
                )}
              >
                {/* O ponto marca o que ainda não foi lido. Quem já leu tudo vê
                    uma lista calma — sem contadores gritando por atenção que
                    a pessoa já deu. */}
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-primary",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", n.read ? "font-normal" : "font-medium")}>
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{n.message}</span>
                </span>
                <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">
                  {quandoFoi(n.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}
