import { supabase } from "@/integrations/supabase/client";

export const WEBHOOK_EVENTS = [
  "demand.created",
  "demand.status_changed",
  "demand.assigned",
  "sla.breached",
  "knowledge.article_published",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "sla_alert" | "assigned" | "status_change" | "system";
  read: boolean;
  link_url: string | null;
  created_at: string;
}

// ---------------- Webhooks CRUD ----------------
export async function listWebhooks(): Promise<Webhook[]> {
  const { data, error } = await supabase
    .from("webhooks" as never)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Webhook[];
}

export async function upsertWebhook(input: Partial<Webhook> & { name: string; url: string; events: string[] }): Promise<void> {
  const payload = {
    name: input.name,
    url: input.url,
    events: input.events,
    active: input.active ?? true,
    secret: input.secret ?? null,
  };
  if (input.id) {
    const { error } = await supabase.from("webhooks" as never).update(payload as never).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("webhooks" as never).insert(payload as never);
    if (error) throw error;
  }
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("webhooks" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function testWebhook(url: string, secret?: string | null): Promise<{ ok: boolean; status?: number; response?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("webhook-test", {
    body: { url, secret: secret ?? "" },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; status?: number; response?: string; error?: string };
}

export async function dispatchWebhookEvent(event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke("webhook-dispatch", { body: { event, payload } });
  } catch {
    // fire-and-forget
  }
}

// ---------------- Notifications ----------------
export async function listNotifications(limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AppNotification[];
}

/**
 * APAGAR DE VERDADE, NAO SO MARCAR COMO LIDA
 *
 * "Marcar todas como lidas" tirava o contador mas deixava a lista igual — a
 * pessoa voltava no dia seguinte e reencontrava as mesmas dez linhas, agora
 * com um tique do lado. Notificação lida que não sai do caminho deixa de ser
 * aviso e vira histórico, e histórico é exatamente o que ninguém quer num
 * sino.
 *
 * A política de exclusão já existia no banco desde o começo; faltava alguém
 * chamá-la.
 */
export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications" as never).delete().eq("id", id);
  if (error) throw error;
}

/**
 * Limpa o que já foi visto, e só isso.
 *
 * Apagar tudo levaria junto o que ainda não foi lido — e o aviso que a pessoa
 * ainda não viu é justamente o único que importa. Um botão que destrói
 * informação não lida é um botão que se aprende a não clicar.
 */
export async function clearReadNotifications(): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("notifications" as never)
    .delete()
    .eq("user_id", uid)
    .eq("read", true);
  if (error) throw error;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from("notifications" as never).update({ read: true } as never).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  const { error } = await supabase
    .from("notifications" as never)
    .update({ read: true } as never)
    .eq("user_id", uid)
    .eq("read", false);
  if (error) throw error;
}
