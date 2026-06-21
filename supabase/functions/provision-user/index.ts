import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  admin,
  ensureAuthUser,
  findUserByEmail,
  findUserByBlocoSub,
  provisionByStrategy,
  applyAtivacao,
  updateRoleByStrategy,
  deactivateByStrategy,
  stampSsoMetadata,
  updateAuthEmail,
} from "../_shared/provision.ts";

const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

function unauthorized() {
  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonResp(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
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
  if (acao === "ping") return jsonResp({ ok: true, ping: true });

  const sb = admin();
  const blocoSub = body?.bloco_sub ? String(body.bloco_sub) : null;

  try {
    // Atualização de e-mail por bloco_sub (idempotente).
    if (acao === "atualizar_email") {
      const novoEmail = String(body?.novo_email ?? "").trim().toLowerCase();
      if (!blocoSub) return jsonResp({ ok: false, error: "bloco_sub_required" }, 400);
      if (!novoEmail) return jsonResp({ ok: false, error: "novo_email_required" }, 400);

      const user = await findUserByBlocoSub(sb, blocoSub);
      if (!user) return jsonResp({ ok: false, error: "user_not_found" }, 404);

      if ((user.email ?? "").toLowerCase() === novoEmail) {
        return jsonResp({ ok: true, user_id: user.id, unchanged: true });
      }
      await updateAuthEmail(sb, user.id, novoEmail);
      return jsonResp({ ok: true, user_id: user.id });
    }

    const email = String(body?.email ?? "").trim().toLowerCase();
    const nome = body?.nome ? String(body.nome) : null;
    const papel = String(body?.papel_slug ?? "");
    const organization_ref = body?.organization_ref ? String(body.organization_ref) : null;
    const mapeamento = body?.mapeamento ?? {};
    const estrategia = String(mapeamento?.estrategia ?? "allowed_emails");

    if (!email && acao !== "desativar") {
      return jsonResp({ ok: false, error: "email_required" }, 400);
    }

    if (acao === "criar" || acao === "reativar") {
      const user = await ensureAuthUser(sb, email, nome, blocoSub);
      await provisionByStrategy({
        sb, estrategia, userId: user.id, email, nome, role: papel,
        organization_ref, mapeamento,
      });
      await applyAtivacao(sb, email, mapeamento, true);
      return jsonResp({ ok: true, user_id: user.id });
    }

    if (acao === "atualizar_papel") {
      // tenta por bloco_sub primeiro, fallback e-mail
      const user = (blocoSub ? await findUserByBlocoSub(sb, blocoSub) : null)
        ?? await findUserByEmail(sb, email);
      if (user) {
        await stampSsoMetadata(sb, user.id, user.app_metadata as Record<string, unknown> | undefined, blocoSub);
      }
      await updateRoleByStrategy({
        sb, estrategia, userId: user?.id ?? "", email, role: papel, mapeamento,
      });
      return jsonResp({ ok: true });
    }

    if (acao === "desativar") {
      const user = (blocoSub ? await findUserByBlocoSub(sb, blocoSub) : null)
        ?? (email ? await findUserByEmail(sb, email) : null);
      const effectiveEmail = email || (user?.email ?? "").toLowerCase();
      await deactivateByStrategy({
        sb, estrategia, userId: user?.id ?? "", email: effectiveEmail, mapeamento,
      });
      return jsonResp({ ok: true });
    }

    return jsonResp({ ok: false, error: "acao_invalida" }, 400);
  } catch (e) {
    console.error("provision-user error", e);
    return jsonResp({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
