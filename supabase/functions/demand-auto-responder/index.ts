// Agente Autônomo Nível 1 — busca artigos na Base de Conhecimento e, se houver
// correspondência forte, posta um comentário público na demanda em nome da IA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Body = { demandId?: string };

interface ArticleRow {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string | null;
  url_externa: string | null;
  relevancia: number | null;
}

const MIN_CONFIDENCE = 0.35;

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function getUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const anon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data } = await anon.auth.getUser(token);
  return data.user?.id ?? null;
}

function buildMessage(article: ArticleRow, confidencePct: number): string {
  const parts: string[] = [];
  parts.push(
    `👋 Olá! Sou o **Agente IA** e enquanto o time humano analisa seu chamado, encontrei uma orientação que pode resolver seu caso.`,
  );
  parts.push("");
  parts.push(`**📚 ${article.titulo}**`);
  if (article.resumo) parts.push(article.resumo);
  if (article.url_externa) parts.push(`\n🔗 ${article.url_externa}`);
  parts.push("");
  parts.push(
    `_Confiança da sugestão: ${confidencePct}%. Se resolveu seu problema, avise a equipe; caso contrário, um atendente humano assumirá o chamado._`,
  );
  return parts.join("\n");
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
      return new Response(JSON.stringify({ error: "demandId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = serviceClient();
    const { data: demand, error: dErr } = await svc
      .from("demands")
      .select("id, title, description, assigned_to, ai_auto_responded")
      .eq("id", demandId)
      .maybeSingle();

    if (dErr) throw dErr;
    if (!demand) {
      return new Response(JSON.stringify({ skipped: "not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (demand.ai_auto_responded) {
      return new Response(JSON.stringify({ skipped: "already_responded" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = [demand.title, demand.description].filter(Boolean).join(" — ");
    const { data: rows, error: sErr } = await svc.rpc("knowledge_search", {
      _q: query,
      _limit: 3,
    });
    if (sErr) console.warn("[knowledge_search] error:", sErr.message);

    const list = (rows ?? []) as ArticleRow[];
    const best = list[0];
    const rawRel = Number(best?.relevancia ?? 0);
    const confidence = Math.max(0, Math.min(1, rawRel * 2));

    if (!best || confidence < MIN_CONFIDENCE) {
      // marca como avaliado (não responde) para não reprocessar em loop
      await svc
        .from("demands")
        .update({ ai_confidence_score: confidence })
        .eq("id", demand.id);
      return new Response(
        JSON.stringify({ ok: false, skipped: "low_confidence", confidence }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const message = buildMessage(best, Math.round(confidence * 100));
    const { data: inserted, error: cErr } = await svc
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
    if (cErr) throw cErr;

    const { error: uErr } = await svc
      .from("demands")
      .update({
        ai_auto_responded: true,
        ai_confidence_score: confidence,
        ai_response_article_id: best.id,
        ai_response_comment_id: inserted.id,
      })
      .eq("id", demand.id);
    if (uErr) throw uErr;

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
    console.error("[demand-auto-responder]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
