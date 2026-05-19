import { supabase } from "@/integrations/supabase/client";

export type Notificacao = {
  id: string;
  userId: string;
  tipo: string;
  solicitacaoId: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  lidaEm: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  tipo: string;
  solicitacao_id: string | null;
  titulo: string;
  mensagem: string;
  lida: boolean;
  lida_em: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
};

function map(r: Row): Notificacao {
  return {
    id: r.id,
    userId: r.user_id,
    tipo: r.tipo,
    solicitacaoId: r.solicitacao_id,
    titulo: r.titulo,
    mensagem: r.mensagem,
    lida: r.lida,
    lidaEm: r.lida_em,
    createdBy: r.created_by,
    createdByEmail: r.created_by_email,
    createdAt: r.created_at,
  };
}

export async function listNotificacoes(userId: string, limit = 30): Promise<Notificacao[]> {
  const { data, error } = await supabase
    .from("notificacoes" as never)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("listNotificacoes:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[]).map(map);
}

export async function markNotificacaoAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notificacoes" as never)
    .update({ lida: true, lida_em: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) console.warn("markNotificacaoAsRead:", error.message);
}

export async function markAllNotificacoesAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notificacoes" as never)
    .update({ lida: true, lida_em: new Date().toISOString() } as never)
    .eq("user_id", userId)
    .eq("lida", false);
  if (error) console.warn("markAllNotificacoesAsRead:", error.message);
}
