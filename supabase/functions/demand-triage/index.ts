import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

type Body = { title?: string; description?: string };

const SYSTEM = `Você é um analista de triagem para um board de demandas técnicas.
Analise o título e descrição e devolva APENAS um objeto JSON, sem texto extra, com os campos:
{
  "priority": "baixa" | "media" | "alta" | "critica",
  "type": "bug" | "melhoria" | "nova_funcionalidade" | "refatoracao" | "infraestrutura" | "automacao",
  "complexity": "facil" | "media" | "dificil",
  "justificativa": string
}
Regras:
- bug: erro/comportamento inesperado; melhoria: incremento em algo existente; nova_funcionalidade: capacidade nova;
  refatoracao: reestruturação técnica; infraestrutura: DevOps/rede/servidor; automacao: workflow/script/integração.
- Prioridade critica só quando bloqueia operação/prazo legal. Se incerto, use media.
- Complexidade estimada de implementação técnica.
- justificativa: 1 frase curta em PT-BR.
Nada além do JSON.`;

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getUserIdFromAuth(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const c = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await c.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

const PRIORS = new Set(["baixa", "media", "alta", "critica"]);
const TYPES = new Set([
  "bug", "melhoria", "nova_funcionalidade", "refatoracao", "infraestrutura", "automacao",
]);
const COMPLEX = new Set(["facil", "media", "dificil"]);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();

    if (!title && description.length < 10) {
      return new Response(
        JSON.stringify({ error: "Informe título e/ou descrição com mais detalhes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = await getUserIdFromAuth(req);
    const svc = getServiceClient();
    const rl = await checkRateLimit(svc, userId);
    if (!rl.permitido) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await callAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `TÍTULO: ${title || "(sem título)"}\nDESCRIÇÃO:\n${description || "(vazia)"}` },
        ],
        response_format: { type: "json_object" },
      },
      { acao: "demand-triage", userId },
    ) as { choices?: Array<{ message?: { content?: string } }> };

    const raw = data.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }

    const priority = typeof parsed.priority === "string" && PRIORS.has(parsed.priority) ? parsed.priority : "media";
    const type = typeof parsed.type === "string" && TYPES.has(parsed.type) ? parsed.type : "melhoria";
    const complexity = typeof parsed.complexity === "string" && COMPLEX.has(parsed.complexity) ? parsed.complexity : "media";
    const justificativa = typeof parsed.justificativa === "string" ? parsed.justificativa.slice(0, 500) : "";

    return new Response(
      JSON.stringify({ priority, type, complexity, justificativa }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("demand-triage error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
