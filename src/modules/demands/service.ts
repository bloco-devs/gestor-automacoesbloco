import { supabase } from "@/integrations/supabase/client";
import type {
  CreateDemandInput,
  Demand,
  DemandAttachment,
  DemandStatus,
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
