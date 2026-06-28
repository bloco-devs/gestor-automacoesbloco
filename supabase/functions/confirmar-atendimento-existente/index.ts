// Onda B4 — confirma "demanda já atendida por sistema existente":
// 1) atualiza a solicitação (service role; bypassa RLS)
// 2) cria notificação na tela para o solicitante
// 3) tenta enviar e-mail via HUB Resend (best-effort; falha não derruba)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

type Body = {
  solicitacao_id?: string;
  sistema_slug?: string;
  nome_sistema?: string;
  url_app?: string | null;
  modulo?: string | null;
  justificativa?: string | null;
};

function svc() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const client = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await client.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function isDevOrAdmin(s: ReturnType<typeof svc>, userId: string): Promise<boolean> {
  // admin via user_roles
  const { data: roles } = await s
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roles) return true;
  // developer/administrador via allowed_emails (e-mail do auth.users)
  const { data: u } = await s.auth.admin.getUserById(userId);
  const email = u?.user?.email?.toLowerCase() ?? null;
  if (!email) return false;
  const { data: ae } = await s
    .from("allowed_emails")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  const role = (ae as { role?: string } | null)?.role ?? null;
  return role === "developer" || role === "administrador";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function tentarEnviarEmail(args: {
  para: string;
  nomeSolicitante: string;
  tituloDemanda: string;
  nomeSistema: string;
  urlApp: string | null;
  modulo: string | null;
  justificativa: string | null;
}): Promise<boolean> {
  if (!HUB_URL || !HUB_TOKEN) return false;
  try {
    const titulo = "Sua demanda já existe no ecossistema Bloco";
    const link = args.urlApp
      ? `<p><a href="${escapeHtml(args.urlApp)}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Abrir ${escapeHtml(args.nomeSistema)}</a></p>`
      : "";
    const modLinha = args.modulo ? ` (${escapeHtml(args.modulo)})` : "";
    const just = args.justificativa
      ? `<p style="color:#475569"><em>${escapeHtml(args.justificativa)}</em></p>`
      : "";
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
<p>Olá, ${escapeHtml(args.nomeSolicitante)}.</p>
<p>Analisamos sua demanda <strong>"${escapeHtml(args.tituloDemanda)}"</strong> e identificamos que essa funcionalidade já é atendida pelo sistema <strong>${escapeHtml(args.nomeSistema)}</strong>${modLinha} do ecossistema Bloco.</p>
${just}
${link}
<p style="color:#64748b;font-size:12px;margin-top:24px">Esta mensagem foi enviada pelo Gestor de Automações Bloco.</p>
</body></html>`;

    const resp = await fetch(`${HUB_URL}/functions/v1/api-gateway/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: args.para,
        subject: titulo,
        html,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.warn("confirmar-atendimento-existente: email HUB falhou", resp.status, txt.slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.warn("confirmar-atendimento-existente: exceção no envio de email:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json()) as Body;
    const solicitacaoId = (body.solicitacao_id ?? "").trim();
    const sistemaSlug = (body.sistema_slug ?? "").trim();
    const nomeSistema = (body.nome_sistema ?? "").trim();
    const urlApp = body.url_app ? String(body.url_app) : null;
    const modulo = body.modulo ? String(body.modulo) : null;
    const justificativa = body.justificativa ? String(body.justificativa) : null;

    if (!solicitacaoId || !sistemaSlug || !nomeSistema) {
      return json({ error: "solicitacao_id, sistema_slug e nome_sistema são obrigatórios." }, 400);
    }

    const callerId = await getCallerUserId(req);
    if (!callerId) return json({ error: "Não autenticado." }, 401);

    const s = svc();
    if (!(await isDevOrAdmin(s, callerId))) {
      return json({ error: "Acesso restrito ao gestor de tecnologia." }, 403);
    }

    // Carrega solicitação (bypass RLS via service role).
    const { data: sol, error: solErr } = await s
      .from("solicitacoes")
      .select("id, titulo, user_id, solicitante_nome, email")
      .eq("id", solicitacaoId)
      .maybeSingle();
    if (solErr) return json({ error: solErr.message }, 500);
    if (!sol) return json({ error: "Solicitação não encontrada." }, 404);

    // 1) Atualiza desfecho.
    const { error: updErr } = await s
      .from("solicitacoes")
      .update({
        desfecho: "atendida_existente",
        atendida_por_sistema_slug: sistemaSlug,
        atendida_url: urlApp,
        atendida_em: new Date().toISOString(),
        atendida_por: callerId,
        consolidada_em: null,
      } as never)
      .eq("id", solicitacaoId);
    if (updErr) return json({ error: updErr.message }, 500);

    // 2) Notificação na tela (somente se houver solicitante vinculado).
    let notificadoTela = false;
    const userId = (sol as { user_id: string | null }).user_id;
    const titulo = (sol as { titulo: string | null }).titulo ?? "Sua solicitação";
    const nomeSolicitante = (sol as { solicitante_nome: string | null }).solicitante_nome ?? "";
    const emailSolicitante = (sol as { email: string | null }).email ?? null;

    if (userId) {
      const modTxt = modulo ? ` (${modulo})` : "";
      const linkTxt = urlApp ? ` Acesse: ${urlApp}.` : "";
      const { data: caller } = await s.auth.admin.getUserById(callerId);
      const callerEmail = caller?.user?.email ?? null;
      const { error: nErr } = await s.from("notificacoes").insert({
        user_id: userId,
        tipo: "atendida_existente",
        solicitacao_id: solicitacaoId,
        titulo: "Sua demanda já existe no ecossistema",
        mensagem: `A funcionalidade de "${titulo}" já é atendida pelo sistema ${nomeSistema}${modTxt}.${linkTxt}`,
        created_by: callerId,
        created_by_email: callerEmail,
      } as never);
      if (nErr) {
        console.warn("confirmar-atendimento-existente: notificação falhou:", nErr.message);
      } else {
        notificadoTela = true;
      }
    }

    // 3) E-mail (best-effort).
    let emailEnviado = false;
    if (emailSolicitante) {
      emailEnviado = await tentarEnviarEmail({
        para: emailSolicitante,
        nomeSolicitante: nomeSolicitante || "solicitante",
        tituloDemanda: titulo,
        nomeSistema,
        urlApp,
        modulo,
        justificativa,
      });
    }

    return json({ ok: true, notificado_tela: notificadoTela, email_enviado: emailEnviado });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("confirmar-atendimento-existente error:", msg);
    return json({ error: msg }, 500);
  }
});
