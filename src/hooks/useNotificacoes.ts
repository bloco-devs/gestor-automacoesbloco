import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  listNotificacoes,
  markAllNotificacoesAsRead,
  markNotificacaoAsRead,
  type Notificacao,
} from "@/lib/notificacoes";

export function useNotificacoes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notificacao[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    const data = await listNotificacoes(user.id);
    setItems(data);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const channelIdRef = useRef<string>(`notificacoes-${crypto.randomUUID()}`);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  const unreadCount = items.filter((n) => !n.lida).length;

  const markAsRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    await markNotificacaoAsRead(id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, lida: true })));
    await markAllNotificacoesAsRead(user.id);
  }, [user?.id]);

  return { items, unreadCount, markAsRead, markAllAsRead, refresh };
}
