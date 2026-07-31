import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

type Body = {
  demandId?: string;
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  complexity?: string;
};

const SYSTEM = `Você é um engenheiro de software sênior analisando demandas técnicas em PT-BR.
Devolva APENAS um objeto JSON, sem texto fora do JSON, com EXATAMENTE estes campos:
{
  "diagnostico": string,      // 2-4 frases: análise técnica clara e objetiva da demanda
  "sugestao": string,         // 3-6 frases em Markdown: passo a passo de arquitetura/código recomendado
  "subtarefas": string[]      // 3 a 8 itens curtos e acionáveis, cada um começando com verbo no infinitivo
}
Regras: seja específico e prático. Nada de listas genéricas. Nada além do JSON.`;

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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    const demandId = (body.demandId ?? "").trim();

    if (!demandId || (!title && !description)) {
      return new Response(
        JSON.stringify({ error: "Informe demandId e ao menos título ou descrição." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = getServiceClient();
    const rl = await checkRateLimit(svc, userId);
    if (!rl.permitido) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMsg = `TÍTULO: ${title || "(sem título)"}
TIPO: ${body.type ?? "(não informado)"}
PRIORIDADE: ${body.priority ?? "(não informado)"}
COMPLEXIDADE: ${body.complexity ?? "(não informado)"}
DESCRIÇÃO:
${description || "(sem descrição detalhada)"}`;

    // deno-lint-ignore no-explicit-any
    const data = (await callAI(
      {
        model: modeloPara("apoio"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      },
      { acao: "demand-ai-plan", userId },
    )) as any;

    const raw: string = data.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }

    const diagnostico = typeof parsed.diagnostico === "string" ? parsed.diagnostico.trim() : "";
    const sugestao = typeof parsed.sugestao === "string" ? parsed.sugestao.trim() : "";
    const subtarefasRaw = Array.isArray(parsed.subtarefas) ? parsed.subtarefas : [];
    const subtarefas = subtarefasRaw
      .map((t) => (typeof t === "string" ? t.trim() : ""))
      .filter((t) => t.length > 0)
      .slice(0, 12);

    // Persistir subtarefas na tabela demand_tasks (append no final)
    let insertedCount = 0;
    if (subtarefas.length > 0) {
      const { data: existing } = await svc
        .from("demand_tasks")
        .select("order_index")
        .eq("demand_id", demandId)
        .order("order_index", { ascending: false })
        .limit(1);
      const baseOrder = (existing?.[0]?.order_index ?? -1) + 1;
      const rows = subtarefas.map((title, i) => ({
        demand_id: demandId,
        title,
        order_index: baseOrder + i,
        created_by: userId,
      }));
      const { error: insErr, count } = await svc
        .from("demand_tasks")
        .insert(rows, { count: "exact" });
      if (insErr) console.error("demand-ai-plan insert tasks error:", insErr.message);
      else insertedCount = count ?? subtarefas.length;
    }

    return new Response(
      JSON.stringify({
        diagnostico: diagnostico || "Não foi possível gerar diagnóstico.",
        sugestao: sugestao || "",
        subtarefas,
        inserted_count: insertedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("demand-ai-plan error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
