import { Bell, Check, CheckCheck } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from "@/modules/notifications";
import type { AppNotification } from "@/modules/notifications";

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
};

export function NotificationsDrawer() {
  const { data: notifications } = useNotifications();
  const markOne = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();

  const list = notifications ?? [];
  const unread = useMemo(() => list.filter((n) => !n.read).length, [list]);

  function handleOpen(n: AppNotification) {
    if (!n.read) markOne.mutate(n.id);
    if (n.link_url) navigate(n.link_url);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-5" />
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
        </div>
        <ScrollArea className="max-h-96">
          {list.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </div>
          ) : (
            <ul className="divide-y">
              {list.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "px-3 py-2.5 cursor-pointer border-l-2 hover:bg-muted/50 transition-colors",
                    TYPE_STYLES[n.type],
                    !n.read && "bg-muted/30",
                  )}
                  onClick={() => handleOpen(n)}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm truncate", !n.read && "font-semibold")}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markOne.mutate(n.id);
                        }}
                        aria-label="Marcar como lida"
                      >
                        <Check className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
