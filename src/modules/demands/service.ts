import { supabase } from "@/integrations/supabase/client";
import type {
  CreateDemandInput,
  Demand,
  DemandAIPlan,
  DemandAttachment,
  DemandStatus,
  DemandTask,
  UserProfileLite,
} from "./types";

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

export async function createDemand(input: CreateDemandInput): Promise<Demand> {
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
      created_by: uid,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Demand;
}

export async function updateDemandStatus(id: string, status: DemandStatus): Promise<void> {
  const { error } = await supabase
    .from("demands" as never)
    .update({ status } as never)
    .eq("id", id);
  if (error) throw error;
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

// ---------- AI plan ----------
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
