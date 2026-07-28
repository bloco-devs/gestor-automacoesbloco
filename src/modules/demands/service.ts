import { supabase } from "@/integrations/supabase/client";
import type {
  CreateDemandInput,
  Demand,
  DemandAIPlan,
  DemandAttachment,
  DemandComplexity,
  DemandPriority,
  DemandStatus,
  DemandTask,
  DemandType,
  UserProfileLite,
} from "./types";

// ---------- Webhook dispatch (fire-and-forget, tolerante a falhas) ----------
async function dispatchWebhookEvent(event: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await supabase.functions.invoke("webhook-dispatch", { body: { event, payload } });
  } catch (err) {
    // Silencioso: falha de webhook nunca deve quebrar a operação do usuário.
    console.warn(`[webhooks] falha ao disparar ${event}:`, err);
  }
}

export async function listDemands(): Promise<Demand[]> {
  const { data, error } = await supabase
    .from("demands" as never)
    .select("*, attachments:demand_attachments(count)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Demand),
    attachments_count: Array.isArray(row.attachments)
      ? Number((row.attachments as Array<{ count: number }>)[0]?.count ?? 0)
      : 0,
  }));
}

export async function createDemand(input: CreateDemandInput & { assigned_to?: string | null }): Promise<Demand> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");
  const { data, error } = await supabase
    .from("demands" as never)
    .insert({
      title: input.title,
      description: input.description ?? null,
      system_id: input.system_id ?? null,
      type: input.type,
      priority: input.priority ?? "media",
      complexity: input.complexity ?? "media",
      assigned_to: input.assigned_to ?? null,
      created_by: uid,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  const demand = data as unknown as Demand;
  void dispatchWebhookEvent("demand.created", {
    id: demand.id,
    title: demand.title,
    priority: demand.priority,
    type: demand.type,
    complexity: demand.complexity,
    status: demand.status,
    assigned_to: demand.assigned_to,
    created_by: demand.created_by,
    created_at: demand.created_at,
  });
  return demand;
}

export async function updateDemandStatus(id: string, status: DemandStatus): Promise<void> {
  // Ler status anterior para incluir no payload
  const { data: prev } = await supabase
    .from("demands" as never)
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const from_status = (prev as { status?: DemandStatus } | null)?.status ?? null;

  // Mesma armadilha de `assignDemand`: RLS negando um UPDATE devolve sucesso
  // com zero linhas. Sem esta checagem, mover uma demanda de status falharia
  // em silêncio e a coluna voltaria sozinha no próximo refetch.
  const { data, error } = await supabase
    .from("demands" as never)
    .update({ status } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) {
    throw new Error(
      "Não foi possível mover esta demanda. Você pode não ter permissão para alterá-la.",
    );
  }
  void dispatchWebhookEvent("demand.status_changed", {
    id,
    from_status,
    to_status: status,
    changed_at: new Date().toISOString(),
  });
}

/**
 * POR QUE ESTE UPDATE CONFERE QUANTAS LINHAS MUDOU
 *
 * Um UPDATE barrado por RLS não devolve erro: o Postgres simplesmente não
 * enxerga a linha, atualiza zero registros e responde sucesso. Foi assim que
 * "Assumir" ficou um botão morto — sem erro no console, sem toast, sem nada
 * para investigar. O `.select()` transforma esse silêncio em fato: se
 * nenhuma linha voltou, a escrita não aconteceu, e isso precisa subir como
 * erro para a interface poder dizer alguma coisa.
 */
export async function assignDemand(id: string, assigned_to: string | null): Promise<void> {
  const { data, error } = await supabase
    .from("demands" as never)
    .update({ assigned_to } as never)
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) {
    throw new Error(
      "Não foi possível atribuir esta demanda. Você pode não ter permissão para alterá-la.",
    );
  }
  void dispatchWebhookEvent("demand.assigned", { id, assigned_to });
}

export async function softDeleteDemand(id: string): Promise<void> {
  const { error } = await supabase
    .from("demands" as never)
    .update({ deleted_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function listAttachments(demandId: string): Promise<DemandAttachment[]> {
  const { data, error } = await supabase
    .from("demand_attachments" as never)
    .select("*")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DemandAttachment[];
}

export async function addAttachment(
  demandId: string,
  attachment: { file_url: string; file_type: string | null; file_name: string | null },
): Promise<DemandAttachment> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  const { data, error } = await supabase
    .from("demand_attachments" as never)
    .insert({
      demand_id: demandId,
      file_url: attachment.file_url,
      file_type: attachment.file_type,
      file_name: attachment.file_name,
      uploaded_by: uid,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DemandAttachment;
}

export async function getAttachmentSignedUrl(
  path: string,
  expiresInSec = 60 * 30,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("demand-attachments")
    .createSignedUrl(path, expiresInSec);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// ---------- Tasks (subtarefas) ----------
export async function listTasks(demandId: string): Promise<DemandTask[]> {
  const { data, error } = await supabase
    .from("demand_tasks" as never)
    .select("*")
    .eq("demand_id", demandId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DemandTask[];
}

export async function createTask(demandId: string, title: string): Promise<DemandTask> {
  const { data: existing } = await supabase
    .from("demand_tasks" as never)
    .select("order_index")
    .eq("demand_id", demandId)
    .order("order_index", { ascending: false })
    .limit(1);
  const baseOrder =
    Number((existing as Array<{ order_index: number }> | null)?.[0]?.order_index ?? -1) + 1;
  const { data: userRes } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("demand_tasks" as never)
    .insert({
      demand_id: demandId,
      title,
      order_index: baseOrder,
      created_by: userRes.user?.id ?? null,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DemandTask;
}

export async function toggleTask(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase
    .from("demand_tasks" as never)
    .update({ completed } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("demand_tasks" as never).delete().eq("id", id);
  if (error) throw error;
}

// ---------- Profiles ----------
export async function getProfilesByIds(ids: string[]): Promise<Map<string, UserProfileLite>> {
  const clean = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, UserProfileLite>();
  if (clean.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .in("id", clean);
  if (error) return map;
  for (const p of (data ?? []) as UserProfileLite[]) map.set(p.id, p);
  return map;
}

// ---------- Workloads (Auto-Assign / balanceamento) ----------
export interface UserWorkload {
  user_id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
  active_count: number;
}

export async function getUserWorkloads(): Promise<UserWorkload[]> {
  const { data, error } = await supabase.rpc("get_user_workloads" as never);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    user_id: String(r.user_id),
    nome: (r.nome as string) ?? null,
    email: (r.email as string) ?? null,
    avatar_url: (r.avatar_url as string) ?? null,
    active_count: Number(r.active_count ?? 0),
  }));
}

// ---------- AI ----------
export async function generateAIPlan(demand: Demand): Promise<DemandAIPlan> {
  const { data, error } = await supabase.functions.invoke("demand-ai-plan", {
    body: {
      demandId: demand.id,
      title: demand.title,
      description: demand.description ?? "",
      type: demand.type,
      priority: demand.priority,
      complexity: demand.complexity,
    },
  });
  if (error) throw error;
  return data as DemandAIPlan;
}

export interface DemandTriageResult {
  priority: DemandPriority;
  type: DemandType;
  complexity: DemandComplexity;
  justificativa: string;
}

export async function triageDemand(input: { title: string; description: string }): Promise<DemandTriageResult> {
  const { data, error } = await supabase.functions.invoke("demand-triage", {
    body: { title: input.title, description: input.description },
  });
  if (error) throw error;
  return data as DemandTriageResult;
}

// ---------- Agente Autônomo Nível 1 ----------
export interface AutoResponderResult {
  ok?: boolean;
  skipped?: string;
  commentId?: string;
  articleId?: string;
  articleTitle?: string;
  confidence?: number;
}

/**
 * Aciona a Edge Function `demand-auto-responder`. Tolerante a falha —
 * nunca deve interromper o fluxo do usuário. Só faz sentido chamar após
 * criar uma demanda que ficou SEM responsável atribuído.
 */
export async function autoRespondDemand(demandId: string): Promise<AutoResponderResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke("demand-auto-responder", {
      body: { demandId },
    });
    if (error) {
      console.warn("[demand-auto-responder] falhou:", error.message);
      return null;
    }
    return (data ?? null) as AutoResponderResult | null;
  } catch (err) {
    console.warn("[demand-auto-responder] exceção:", err);
    return null;
  }
}

// ---------- Deflexão de chamados (Base de Conhecimento) ----------
export interface RecordDeflectionInput {
  articleId?: string | null;
  queryText: string;
  origin?: string;
}

export async function recordDeflection(input: RecordDeflectionInput): Promise<void> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase
      .from("ticket_deflections" as never)
      .insert({
        user_id: uid,
        article_id: input.articleId ?? null,
        query_text: input.queryText.slice(0, 1000),
        resolved_without_ticket: true,
        origin: input.origin ?? "portal",
      } as never);
  } catch (err) {
    console.warn("[ticket_deflections] falha:", err);
  }
}

