import { supabase } from "@/integrations/supabase/client";

// As tabelas são novas e `src/integrations/supabase/types.ts` é gerado pelo
// Lovable — até ele rodar de novo, o cliente não conhece estes nomes. O
// `as never` é o mesmo escape que `listWebhooks` e `listDemands` já usam.

export interface PreferenciasEmail {
  email_ativo: boolean;
  email_demanda_criada: boolean;
  email_mudanca_status: boolean;
  email_concluida: boolean;
}

/**
 * Quem nunca abriu a tela de preferências não tem linha no banco, e recebe
 * tudo. O padrão vive aqui e no trigger — se mudar de ideia, muda nos dois.
 */
export const PREFERENCIAS_PADRAO: PreferenciasEmail = {
  email_ativo: true,
  email_demanda_criada: true,
  email_mudanca_status: true,
  email_concluida: true,
};

export async function getPreferencias(): Promise<PreferenciasEmail> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("notificacao_preferencias" as never)
    .select("email_ativo, email_demanda_criada, email_mudanca_status, email_concluida")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as PreferenciasEmail | null) ?? PREFERENCIAS_PADRAO;
}

export async function salvarPreferencias(patch: Partial<PreferenciasEmail>): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Usuário não autenticado");

  // Upsert e não update: a primeira vez que alguém mexe num interruptor é
  // também a primeira vez que a linha existe. Um update aqui atualizaria zero
  // linhas e "salvaria" sem salvar — a mesma armadilha de RLS que
  // `updateDemandStatus` documenta.
  const atual = await getPreferencias();
  const { error } = await supabase
    .from("notificacao_preferencias" as never)
    .upsert({ user_id: uid, ...atual, ...patch } as never, { onConflict: "user_id" });

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Fila (painel da equipe)
// ---------------------------------------------------------------------------

export type SituacaoEnvio = "pendente" | "enviado" | "falhou" | "cancelado";
export type EventoEmail = "demanda_criada" | "status_mudou" | "demanda_concluida";

export interface ItemFilaEmail {
  id: string;
  destinatario_email: string;
  demanda_id: string | null;
  evento: EventoEmail;
  dados: {
    ticket_code?: string | null;
    titulo?: string | null;
    nome?: string | null;
    rotulo?: string | null;
    rotulo_antes?: string | null;
  };
  situacao: SituacaoEnvio;
  tentativas: number;
  ultimo_erro: string | null;
  enviado_em: string | null;
  created_at: string;
}

export const ROTULO_EVENTO: Record<EventoEmail, string> = {
  demanda_criada: "Recebemos sua solicitação",
  status_mudou: "Mudança de situação",
  demanda_concluida: "Concluída",
};

export async function listarFila(situacao?: SituacaoEnvio): Promise<ItemFilaEmail[]> {
  let q = supabase
    .from("notificacao_email_fila" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (situacao) q = q.eq("situacao", situacao);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ItemFilaEmail[];
}

/** Devolve a linha para a fila zerando o contador. Só a equipe consegue. */
export async function reenviar(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("notificacao_email_fila" as never)
    .update({ situacao: "pendente", tentativas: 0, ultimo_erro: null } as never)
    .eq("id", id)
    .select("id");

  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) {
    throw new Error("Não foi possível reenviar. Você pode não ter permissão.");
  }
}

export interface ResumoProcessamento {
  processados: number;
  enviados: number;
  falhas: number;
}

/**
 * Muleta para quem não quer esperar o cron do minuto seguinte — e único jeito
 * de a fila andar enquanto o cron não estiver agendado (ver o rodapé da
 * migration 20260819120000).
 */
export async function processarFilaAgora(): Promise<ResumoProcessamento> {
  const { data, error } = await supabase.functions.invoke("notificacao-email-fila", {
    body: {},
  });
  if (error) throw error;
  return data as ResumoProcessamento;
}
