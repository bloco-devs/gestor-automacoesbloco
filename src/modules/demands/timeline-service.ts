import { supabase } from "@/integrations/supabase/client";

export interface DemandComment {
  id: string;
  demand_id: string;
  user_id: string | null;
  content: string;
  is_internal: boolean;
  is_ai?: boolean;
  /** Aviso automático (boas-vindas da triagem). Ninguém edita nem exclui. */
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}


export interface DemandAuditLog {
  id: string;
  demand_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export async function listComments(demandId: string): Promise<DemandComment[]> {
  const { data, error } = await supabase
    .from("demand_comments" as never)
    .select("*")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DemandComment[];
}

export async function createComment(
  demandId: string,
  content: string,
  isInternal: boolean,
): Promise<DemandComment> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");
  const { data, error } = await supabase
    .from("demand_comments" as never)
    .insert({
      demand_id: demandId,
      user_id: uid,
      content,
      is_internal: isInternal,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as DemandComment;
}

export async function listAuditLogs(demandId: string): Promise<DemandAuditLog[]> {
  const { data, error } = await supabase
    .from("demand_audit_logs" as never)
    .select("*")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DemandAuditLog[];
}
