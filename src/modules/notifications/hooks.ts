import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteWebhook,
  listNotifications,
  listWebhooks,
  markAllNotificationsRead,
  markNotificationRead,
  testWebhook,
  upsertWebhook,
  type Webhook,
} from "./service";

const NOTI_KEY = ["notifications"] as const;
const HOOK_KEY = ["webhooks"] as const;

export function useNotifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: NOTI_KEY, queryFn: () => listNotifications() });

  useEffect(() => {
    let uid: string | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      uid = data.user?.id;
      if (!uid) return;
      // O nome do canal precisa ser único POR INSTÂNCIA do hook, não por
      // usuário: supabase-js guarda os canais num cache por nome, então dois
      // componentes montados ao mesmo tempo (o AppLayout renderiza o
      // NotificationsDrawer duas vezes — uma no shell mobile, outra no
      // desktop) recebiam o MESMO objeto de canal. O segundo chamava `.on()`
      // num canal que o primeiro já tinha dado `.subscribe()`, e o supabase
      // rejeita isso: "cannot add postgres_changes callbacks after
      // subscribe()". O erro subia como promise não tratada e o segundo
      // drawer ficava sem realtime — notificação só aparecia recarregando.
      // `useDemands` já usava randomUUID pelo mesmo motivo.
      channel = supabase
        .channel(`notifications-${uid}-${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          () => qc.invalidateQueries({ queryKey: NOTI_KEY }),
        )
        .subscribe();
    });
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  return q;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTI_KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTI_KEY }),
  });
}

export function useWebhooks() {
  return useQuery({ queryKey: HOOK_KEY, queryFn: listWebhooks });
}

export function useUpsertWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<Webhook> & { name: string; url: string; events: string[] }) => upsertWebhook(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOOK_KEY }),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: HOOK_KEY }),
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: ({ url, secret }: { url: string; secret?: string | null }) => testWebhook(url, secret),
  });
}
