import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  admin,
  ensureAuthUser,
  findUserByEmail,
  provisionByStrategy,
  applyAtivacao,
  updateRoleByStrategy,
  deactivateByStrategy,
} from "../_shared/provision.ts";

const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!HUB_TOKEN || token !== HUB_TOKEN) return unauthorized();

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const acao = String(body?.acao ?? "");
  if (acao === "ping") {
    return new Response(JSON.stringify({ ok: true, ping: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const nome = body?.nome ? String(body.nome) : null;
  const papel = String(body?.papel_slug ?? "");
  const organization_ref = body?.organization_ref ? String(body.organization_ref) : null;
  const mapeamento = body?.mapeamento ?? {};
  const estrategia = String(mapeamento?.estrategia ?? "allowed_emails");

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "email_required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = admin();

  try {
    if (acao === "criar" || acao === "reativar") {
      const user = await ensureAuthUser(sb, email, nome);
      await provisionByStrategy({
        sb, estrategia, userId: user.id, email, nome, role: papel,
        organization_ref, mapeamento,
      });
      await applyAtivacao(sb, email, mapeamento, true);
      return new Response(JSON.stringify({ ok: true, user_id: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (acao === "atualizar_papel") {
      const user = await findUserByEmail(sb, email);
      await updateRoleByStrategy({
        sb, estrategia, userId: user?.id ?? "", email, role: papel, mapeamento,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (acao === "desativar") {
      const user = await findUserByEmail(sb, email);
      await deactivateByStrategy({
        sb, estrategia, userId: user?.id ?? "", email, mapeamento,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: "acao_invalida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("provision-user error", e);
    return new Response(JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
