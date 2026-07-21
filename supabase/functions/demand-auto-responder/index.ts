// Agente Autônomo Nível 1 — busca artigos na Base de Conhecimento e, se houver
// correspondência forte, posta um comentário público na demanda em nome da IA.
//
// Chamada pelo frontend logo após createDemand() quando `assigned_to` é nulo.
// Segurança: exige JWT do solicitante; usa service_role para gravar comentário
// com `user_id = NULL` + `is_ai = true` (nova RLS bloqueia isso para clientes).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Body = { demandId?: string; title?: string; description?: string };

interface ArticleRow {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string | null;
  url_externa: string | null;
  relevancia: number | null;
}

const MIN_CONFIDENCE = 0.35; // 0-1 (ts_rank_cd normalizado)

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const c = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data } = await c.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

function buildMessage(article: ArticleRow, confidencePct: number): string {
  const linhas: string[] = [];
  linhas.push(`👋 Olá! Sou o **Agente IA Nível 1** do time de Automações.`);
  linhas.push("");
  linhas.push(
    `Enquanto um analista humano assume seu chamado, encontrei este material na nossa Base de Conhecimento que **pode resolver seu problema agora mesmo** (confiança: ${confidencePct}%):`,
  );
  linhas.push("");
  linhas.push(`**${article.titulo}**`);
  if (article.resumo) linhas.push(article.resumo.trim());
  linhas.push("");
  if (article.url_externa) linhas.push(`🔗 ${article.url_externa}`);
  else linhas.push(`🔗 Abra em: /ajuda?artigo=${article.id}`);
  linhas.push("");
  linhas.push(
    "Se isto resolveu, é só nos avisar por aqui e fecharemos o chamado. Caso não resolva, um analista humano dará continuidade.",
  );
  return linhas.join("\n");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserId(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const demandId = (body.demandId ?? "").trim();
    if (!demandId) {
      return new Response(JSON.stringify({ error: "demandId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = serviceClient();

    // Carrega dados atuais da demanda (tolerante ao chamador enviar título/descrição direto).
    const { data: demand } = await svc
      .from("demands")
      .select("id, title, description, ai_auto_responded")
      .eq("id", demandId)
      .maybeSingle();

    if (!demand) {
      return new Response(JSON.stringify({ error: "demand not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (demand.ai_auto_responded) {
      return new Response(JSON.stringify({ skipped: "already_responded" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = [demand.title, demand.description ?? ""].filter(Boolean).join(" — ").trim();
    if (query.length < 8) {
      return new Response(JSON.stringify({ skipped: "short_query" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca artigos via RPC de full-text search já existente.
    const { data: rows, error: searchErr } = await svc.rpc("knowledge_search", {
      _q: query,
      _limit: 3,
    });
    if (searchErr) {
      return new Response(JSON.stringify({ skipped: "search_failed", detail: searchErr.message }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const list = (Array.isArray(rows) ? rows : []) as ArticleRow[];
    const best = list[0];
    if (!best) {
      return new Response(JSON.stringify({ skipped: "no_match" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ts_rank_cd é ilimitado; usamos limiar direto (empírico). Confiança ~ min(1, rel*2).
    const raw = Number(best.relevancia ?? 0);
    const confidence = Math.max(0, Math.min(1, raw * 2));
    if (confidence < MIN_CONFIDENCE) {
      return new Response(
        JSON.stringify({ skipped: "low_confidence", confidence }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const confidencePct = Math.round(confidence * 100);
    const message = buildMessage(best, confidencePct);

    // Publica o comentário público como AGENTE IA (user_id NULL, is_ai TRUE).
    const { data: inserted, error: insErr } = await svc
      .from("demand_comments")
      .insert({
        demand_id: demand.id,
        user_id: null,
        content: message,
        is_internal: false,
        is_ai: true,
      })
      .select("id")
      .single();
    if (insErr) {
      return new Response(JSON.stringify({ error: "insert_failed", detail: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marca a demanda como respondida pela IA.
    await svc
      .from("demands")
      .update({
        ai_auto_responded: true,
        ai_confidence_score: Number(confidence.toFixed(3)),
        ai_response_article_id: best.id,
        ai_response_comment_id: inserted.id,
      })
      .eq("id", demand.id);

    return new Response(
      JSON.stringify({
        ok: true,
        commentId: inserted.id,
        articleId: best.id,
        articleTitle: best.titulo,
        confidence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
