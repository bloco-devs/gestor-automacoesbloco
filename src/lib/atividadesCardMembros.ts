import { supabase } from "@/integrations/supabase/client";

// Tabela criada fora do fluxo de tipos gerados.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface EquipeUsuario {
  id: string;
  nome: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

/**
 * Usuários elegíveis a responsáveis de cartão.
 * O filtro por papel (`developer` / `administrador`) é feito NO BANCO, pela
 * função `list_equipe_users()` — nunca em JavaScript.
 */
export async function listEquipeUsuarios(): Promise<EquipeUsuario[]> {
  const { data, error } = await sb.rpc("list_equipe_users");
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    nome: r.nome ?? r.email ?? "Usuário",
    email: r.email ?? "",
    role: r.role ?? "",
    avatarUrl: r.avatar_url ?? null,
  }));
}

export interface CardMembro extends EquipeUsuario {
  vinculoId: string;
}

export async function listMembrosDoCard(cardId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("atividades_card_membros")
    .select("user_id")
    .eq("card_id", cardId);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r.user_id as string);
}

export async function vincularMembro(cardId: string, userId: string): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const { error } = await sb
    .from("atividades_card_membros")
    .insert({ card_id: cardId, user_id: userId, added_by: sessao.user?.id ?? null });
  if (error) throw error;
}

export async function desvincularMembro(cardId: string, userId: string): Promise<void> {
  const { error } = await sb
    .from("atividades_card_membros")
    .delete()
    .eq("card_id", cardId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
