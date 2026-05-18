import { supabase } from "@/integrations/supabase/client";

export interface SetorRow {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export async function listSetores(): Promise<SetorRow[]> {
  const { data, error } = await supabase
    .from("setores")
    .select("id,nome,descricao,created_at")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SetorRow[];
}

export async function createSetor(nome: string, descricao?: string): Promise<SetorRow> {
  const payload = { nome: nome.trim(), descricao: (descricao ?? "").trim() || null };
  const { data, error } = await supabase
    .from("setores")
    .insert(payload)
    .select("id,nome,descricao,created_at")
    .single();
  if (error) throw error;
  return data as SetorRow;
}

export async function deleteSetor(id: string): Promise<void> {
  const { error } = await supabase.from("setores").delete().eq("id", id);
  if (error) throw error;
}
