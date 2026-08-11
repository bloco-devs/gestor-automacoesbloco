import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  agruparNotificacoes,
  useClearReadNotifications,
  useDeleteNotifications,
  useMarkAllRead,
  useMarkNotificationsRead,
  useNotifications,
} from "@/modules/notifications";
import type { AppNotification, GrupoDeNotificacoes } from "@/modules/notifications";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

const TYPE_STYLES: Record<AppNotification["type"], string> = {
  sla_alert: "border-l-destructive",
  assigned: "border-l-info",
  status_change: "border-l-warning",
  system: "border-l-muted-foreground",
  new_comment: "border-l-primary",
};

export function NotificationsDrawer() {
  const { data: notifications } = useNotifications();
  const marcarLidas = useMarkNotificationsRead();
  const markAll = useMarkAllRead();
  const remover = useDeleteNotifications();
  const limparLidas = useClearReadNotifications();
  const navigate = useNavigate();

  const list = notifications ?? [];
  const grupos = useMemo(() => agruparNotificacoes(list), [list]);

  /**
   * O contador conta GRUPOS, não linhas do banco.
   *
   * Se o sino marcasse 5 e a lista mostrasse 1, o número estaria certo e
   * ainda assim seria um erro: badge e lista precisam responder à mesma
   * pergunta, senão a pessoa abre para conferir e sai sem entender o que
   * viu. O que ela quer saber é quantos ASSUNTOS a esperam.
   */
  const unread = useMemo(() => grupos.filter((g) => g.naoLidas > 0).length, [grupos]);
  const lidas = useMemo(() => list.filter((n) => n.read).length, [list]);

  function handleOpen(g: GrupoDeNotificacoes) {
    if (g.naoLidas > 0) marcarLidas.mutate(g.ids);
    const destino = g.representante.link_url;
    if (destino) navigate(destino);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("sino-botao relative rounded-full", unread > 0 && "sino-botao--nao-lido")}
          aria-label="Notificações"
        >
          <Bell className="sino-icone size-[18px]" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full flex items-center justify-center"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-medium">Notificações</div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Marcar todas
            </Button>
            {/* Limpa só o que já foi visto. Apagar tudo levaria junto o aviso
                que a pessoa ainda não leu — e esse é o único que importa. Um
                botão que destrói informação não lida é um botão que se aprende
                a não clicar. */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={lidas === 0 || limparLidas.isPending}
              onClick={() => limparLidas.mutate()}
              title="Remover as notificações já lidas"
            >
              <Trash2 className="size-3.5 mr-1" />
              Limpar lidas
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {list.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          ) : (
            <ul className="divide-y">
              {grupos.map((g) => {
                const n = g.representante;
                return (
                <li
                  key={g.id}
                  className={cn(
                    "notificacao-item group/noti px-3 py-2.5 cursor-pointer border-l-2 hover:bg-muted/50 transition-colors",
                    g.naoLidas === 0 && "notificacao-item--lida",
                    TYPE_STYLES[n.type],
                    g.naoLidas > 0 && "bg-muted/30",
                  )}
                  onClick={() => handleOpen(g)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", g.naoLidas > 0 && "font-semibold")}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      {/* O contador não é decoração: ele é a prova de que nada
                          foi escondido. Sem ele, quatro avisos somem em
                          silêncio e o agrupamento vira perda de informação. */}
                      {g.quantidade > 1 && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {g.quantidade} atualizações
                        </span>
                      )}
                    </div>
                    {/* Dois destinos possíveis para um aviso: virou lido, ou
                        não interessa mais. Antes só existia o primeiro, e a
                        lista crescia para sempre. Os botões aparecem no hover
                        para não poluir a leitura — mas continuam alcançáveis
                        por teclado. */}
                    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/noti:opacity-100 focus-within:opacity-100">
                      {g.naoLidas > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarLidas.mutate(g.ids);
                          }}
                          aria-label="Marcar como lida"
                          title="Marcar como lida"
                        >
                          <Check className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          remover.mutate(g.ids);
                        }}
                        aria-label="Remover notificação"
                        title="Remover"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </span>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
