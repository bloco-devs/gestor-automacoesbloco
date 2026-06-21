import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { admin, ensureAuthUser, provisionByStrategy, applyAtivacao } from "../_shared/provision.ts";

const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";
const HUB_URL = Deno.env.get("BLOCO_ID_HUB_URL") ?? "";
const LAUNCHER = Deno.env.get("BLOCO_ID_LAUNCHER_URL") ?? "https://blocoid.lovable.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const sso_token = String(body?.sso_token ?? "");
  if (!sso_token) {
    return new Response(JSON.stringify({ ok: false, error: "sso_token_required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const introspect = await fetch(`${HUB_URL}/sso-introspect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUB_TOKEN}`,
      },
      body: JSON.stringify({ token: sso_token }),
    });

    if (!introspect.ok) {
      const txt = await introspect.text().catch(() => "");
      console.error("sso-introspect failed", introspect.status, txt);
      return new Response(JSON.stringify({ ok: false, error: "introspect_failed" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await introspect.json();
    const email = String(data?.email ?? "").trim().toLowerCase();
    const nome = data?.nome ? String(data.nome) : null;
    const papel = String(data?.papel_slug ?? "");
    const organization_ref = data?.organization_ref ? String(data.organization_ref) : null;
    const mapeamento = data?.mapeamento ?? { estrategia: "allowed_emails" };
    const estrategia = String(mapeamento?.estrategia ?? "allowed_emails");
    const blocoSub = data?.bloco_sub ? String(data.bloco_sub) : null;

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: "no_email" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = admin();

    // 1º upsert na whitelist para is_allowed_user() aprovar
    await provisionByStrategy({
      sb, estrategia, userId: "", email, nome, role: papel,
      organization_ref, mapeamento,
    });

    // garante usuário — prefere lookup por bloco_sub, fallback e-mail; carimba app_metadata
    const user = await ensureAuthUser(sb, email, nome, blocoSub);
    await applyAtivacao(sb, email, mapeamento, true);

    // Magic link
    const origin = req.headers.get("origin") ?? LAUNCHER;
    const redirectTo = `${origin}/`;
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (linkErr) throw linkErr;

    const action_link = (linkData as any)?.properties?.action_link
      ?? (linkData as any)?.action_link;
    if (!action_link) throw new Error("no_action_link");

    return new Response(JSON.stringify({ ok: true, redirect_url: action_link, user_id: user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sso-login error", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
