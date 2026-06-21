// Genérico de provisionamento por estratégia de mapeamento.
// Usado por sso-login e provision-user.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const VALID_ROLES = ["administrador", "developer", "requester", "builder"] as const;
export type LocalRole = typeof VALID_ROLES[number];

export function normalizeRole(papel?: string | null): LocalRole {
  const v = (papel ?? "").toString().trim().toLowerCase();
  return (VALID_ROLES as readonly string[]).includes(v) ? (v as LocalRole) : "requester";
}

export function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function findUserByEmail(sb: SupabaseClient, email: string) {
  // Pagina até achar — base costuma ser pequena.
  let page = 1;
  while (page < 50) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

export async function findUserByBlocoSub(sb: SupabaseClient, blocoSub: string) {
  if (!blocoSub) return null;
  let page = 1;
  while (page < 50) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => {
      const meta = (x.app_metadata ?? {}) as Record<string, unknown>;
      return meta.bloco_sub != null && String(meta.bloco_sub) === String(blocoSub);
    });
    if (u) return u;
    if (data.users.length < 200) break;
    page++;
  }
  return null;
}

export async function stampSsoMetadata(
  sb: SupabaseClient,
  userId: string,
  current: Record<string, unknown> | null | undefined,
  blocoSub?: string | null,
) {
  const base = { ...(current ?? {}), sso_provider: "bloco_id" } as Record<string, unknown>;
  if (blocoSub) base.bloco_sub = String(blocoSub);
  try {
    await sb.auth.admin.updateUserById(userId, { app_metadata: base });
  } catch (_) { /* ignore */ }
}

export async function ensureAuthUser(
  sb: SupabaseClient,
  email: string,
  nome?: string | null,
  blocoSub?: string | null,
) {
  const lower = email.toLowerCase().trim();
  // 1) tenta por bloco_sub
  let user = blocoSub ? await findUserByBlocoSub(sb, blocoSub) : null;
  // 2) fallback por e-mail
  if (!user) user = await findUserByEmail(sb, lower);
  if (!user) {
    const app_metadata: Record<string, unknown> = { sso_provider: "bloco_id" };
    if (blocoSub) app_metadata.bloco_sub = String(blocoSub);
    const { data, error } = await sb.auth.admin.createUser({
      email: lower,
      email_confirm: true,
      app_metadata,
      user_metadata: { nome: nome ?? lower.split("@")[0] },
    });
    if (error) throw error;
    user = data.user;
  } else {
    // remover ban
    try {
      await sb.auth.admin.updateUserById(user.id, { ban_duration: "none" });
    } catch (_) { /* ignore */ }
    await stampSsoMetadata(sb, user.id, user.app_metadata as Record<string, unknown> | undefined, blocoSub);
  }
  return user!;
}

export async function updateAuthEmail(
  sb: SupabaseClient,
  userId: string,
  novoEmail: string,
) {
  const lower = novoEmail.toLowerCase().trim();
  const { data, error } = await sb.auth.admin.updateUserById(userId, {
    email: lower,
    email_confirm: true,
  });
  if (error) throw error;
  // Reflete em profiles (se houver coluna email).
  try {
    await sb.from("profiles").update({ email: lower }).eq("id", userId);
  } catch (_) { /* ignore (coluna pode não existir) */ }
  return data.user;
}

type Mapeamento = {
  estrategia?: string;
  tabela?: string;
  colunas?: Record<string, string>;
  ativacao?: { coluna?: string; ativo?: unknown; inativo?: unknown };
  papel_coluna?: string;
};

// upsert na whitelist allowed_emails do Gestor de Automações
async function strategyAllowedEmails(
  sb: SupabaseClient,
  email: string,
  nome: string | null,
  role: LocalRole,
) {
  const { error } = await sb
    .from("allowed_emails")
    .upsert({ email, nome: nome ?? null, role }, { onConflict: "email" });
  if (error) throw error;
}

async function strategyUserRoles(
  sb: SupabaseClient,
  userId: string,
  role: string,
  mapeamento: Mapeamento,
) {
  const tabela = mapeamento.tabela ?? "user_roles";
  const colUser = mapeamento.colunas?.user_id ?? "user_id";
  const colRole = mapeamento.colunas?.role ?? "role";
  const row: Record<string, unknown> = { [colUser]: userId, [colRole]: role };
  const { error } = await sb.from(tabela).upsert(row, { onConflict: `${colUser},${colRole}` });
  if (error) throw error;
}

async function strategyColunaPerfil(
  sb: SupabaseClient,
  userId: string,
  email: string,
  nome: string | null,
  role: string,
  mapeamento: Mapeamento,
) {
  const tabela = mapeamento.tabela ?? "profiles";
  const colId = mapeamento.colunas?.id ?? "id";
  const colEmail = mapeamento.colunas?.email ?? "email";
  const colNome = mapeamento.colunas?.nome ?? "nome";
  const colRole = mapeamento.papel_coluna ?? mapeamento.colunas?.role ?? "role";
  const row: Record<string, unknown> = {
    [colId]: userId,
    [colEmail]: email,
    [colNome]: nome,
    [colRole]: role,
  };
  const { error } = await sb.from(tabela).upsert(row, { onConflict: colId });
  if (error) throw error;
}

async function strategyOrgMembership(
  sb: SupabaseClient,
  userId: string,
  role: string,
  organization_ref: string | null,
  mapeamento: Mapeamento,
) {
  const tabela = mapeamento.tabela ?? "memberships";
  const colUser = mapeamento.colunas?.user_id ?? "user_id";
  const colOrg = mapeamento.colunas?.organization_id ?? "organization_id";
  const colRole = mapeamento.colunas?.role ?? "role";
  const row: Record<string, unknown> = {
    [colUser]: userId,
    [colOrg]: organization_ref,
    [colRole]: role,
  };
  const { error } = await sb.from(tabela).upsert(row, { onConflict: `${colUser},${colOrg}` });
  if (error) throw error;
}

export async function applyAtivacao(
  sb: SupabaseClient,
  email: string,
  mapeamento: Mapeamento,
  ativo: boolean,
) {
  if (!mapeamento?.ativacao?.coluna) return;
  // Para o caso da estratégia allowed_emails só faz sentido se a tabela tiver a coluna.
  // Aqui apenas tenta o update e ignora se falhar.
  try {
    await sb
      .from(mapeamento.tabela ?? "allowed_emails")
      .update({ [mapeamento.ativacao.coluna]: ativo ? mapeamento.ativacao.ativo : mapeamento.ativacao.inativo })
      .eq("email", email);
  } catch (_) { /* ignore */ }
}

export async function provisionByStrategy(args: {
  sb: SupabaseClient;
  estrategia: string;
  userId: string;
  email: string;
  nome: string | null;
  role: string;
  organization_ref: string | null;
  mapeamento: Mapeamento;
}) {
  const { sb, estrategia, userId, email, nome, role, organization_ref, mapeamento } = args;
  switch (estrategia) {
    case "allowed_emails":
      return strategyAllowedEmails(sb, email, nome, normalizeRole(role));
    case "user_roles":
      return strategyUserRoles(sb, userId, role, mapeamento);
    case "coluna_perfil":
      return strategyColunaPerfil(sb, userId, email, nome, role, mapeamento);
    case "org_membership":
      return strategyOrgMembership(sb, userId, role, organization_ref, mapeamento);
    default:
      // default: whitelist deste sistema
      return strategyAllowedEmails(sb, email, nome, normalizeRole(role));
  }
}

export async function updateRoleByStrategy(args: {
  sb: SupabaseClient;
  estrategia: string;
  userId: string;
  email: string;
  role: string;
  mapeamento: Mapeamento;
}) {
  const { sb, estrategia, userId, email, role, mapeamento } = args;
  switch (estrategia) {
    case "allowed_emails": {
      const { error } = await sb
        .from("allowed_emails")
        .update({ role: normalizeRole(role) })
        .eq("email", email);
      if (error) throw error;
      return;
    }
    case "user_roles":
      return strategyUserRoles(sb, userId, role, mapeamento);
    case "coluna_perfil": {
      const tabela = mapeamento.tabela ?? "profiles";
      const colId = mapeamento.colunas?.id ?? "id";
      const colRole = mapeamento.papel_coluna ?? mapeamento.colunas?.role ?? "role";
      const { error } = await sb.from(tabela).update({ [colRole]: role }).eq(colId, userId);
      if (error) throw error;
      return;
    }
    default: {
      const { error } = await sb
        .from("allowed_emails")
        .update({ role: normalizeRole(role) })
        .eq("email", email);
      if (error) throw error;
      return;
    }
  }
}

export async function deactivateByStrategy(args: {
  sb: SupabaseClient;
  estrategia: string;
  userId: string;
  email: string;
  mapeamento: Mapeamento;
}) {
  const { sb, estrategia, userId, email, mapeamento } = args;
  if (estrategia === "allowed_emails" || !estrategia) {
    // remove a linha (corta o is_allowed_user())
    await sb.from("allowed_emails").delete().eq("email", email);
  } else if (mapeamento?.ativacao?.coluna) {
    await applyAtivacao(sb, email, mapeamento, false);
  }
  // Sempre bane o auth user (NUNCA deleta).
  try {
    await sb.auth.admin.updateUserById(userId, { ban_duration: "876600h" });
  } catch (_) { /* ignore */ }
}
