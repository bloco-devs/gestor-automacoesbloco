import { supabase } from "@/integrations/supabase/client";

export interface TipoDemandaRow {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export async function listTiposDemanda(): Promise<TipoDemandaRow[]> {
  const { data, error } = await supabase
    .from("tipos_demanda")
    .select("id,nome,descricao,ativo,created_at")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TipoDemandaRow[];
}

export async function createTipoDemanda(nome: string, descricao?: string): Promise<TipoDemandaRow> {
  const payload = { nome: nome.trim(), descricao: (descricao ?? "").trim() || null };
  const { data, error } = await supabase
    .from("tipos_demanda")
    .insert(payload)
    .select("id,nome,descricao,ativo,created_at")
    .single();
  if (error) throw error;
  return data as TipoDemandaRow;
}

export async function updateTipoDemanda(
  id: string,
  patch: Partial<Pick<TipoDemandaRow, "nome" | "descricao" | "ativo">>
): Promise<void> {
  const { error } = await supabase.from("tipos_demanda").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTipoDemanda(id: string): Promise<void> {
  const { error } = await supabase.from("tipos_demanda").delete().eq("id", id);
  if (error) throw error;
}
