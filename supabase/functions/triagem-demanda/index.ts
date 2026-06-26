import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

type Body = { titulo?: string; descricao?: string; setor?: string };

const SYSTEM = `Você é um analista de priorização de demandas de automação interna na escala 0-10 para CADA fator. Devolva APENAS um objeto JSON, sem texto fora do JSON, com EXATAMENTE estes campos:
{
  "frequencia": number,        // 0-10. 0=Nunca, 2=Raro (<1×/mês), 4=Mensal, 6=Semanal, 8=Diário, 10=Várias vezes/dia
  "dificuldade": number,       // 0-10. 0=Trivial, 2=Fácil, 4=Moderada, 6=Difícil, 8=Muito difícil, 10=Crítica
  "retorno": number,           // 0-10. Retorno financeiro mensal. 0=Nenhum, 2=R$0-500, 4=R$500-2,5k, 6=R$2,5k-10k, 8=R$10k-50k, 10=R$50k+
  "complexidade_dev": number,  // 0-10. Estimativa de complexidade TÉCNICA de implementar. 0=trivial automação, 10=projeto longo/integração crítica
  "justificativa": string      // 1-2 frases curtas em PT-BR explicando a estimativa
}
Regras: números inteiros entre 0 e 10. Se a descrição for vaga, escolha valores medianos plausíveis e diga isso na justificativa. Nada além do JSON.`;

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

function clamp10(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 5;
  return Math.max(0, Math.min(10, Math.round(v)));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const titulo = (body.titulo ?? "").trim();
    const descricao = (body.descricao ?? "").trim();
    const setor = (body.setor ?? "").trim();

    if (!descricao || descricao.length < 10) {
      return new Response(
        JSON.stringify({ error: "Descreva a demanda com mais detalhes para a IA estimar." }),
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

    const userMsg = `TÍTULO: ${titulo || "(sem título)"}
SETOR: ${setor || "(não informado)"}
DESCRIÇÃO:
${descricao}`;

    const data = await callAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      },
      { acao: "triagem-demanda", userId },
    ) as any;

    const raw: string = data.choices?.[0]?.message?.content ?? "";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Tenta extrair primeiro bloco JSON do texto.
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch { /* ignore */ }
      }
    }

    const resposta = {
      frequencia: clamp10(parsed.frequencia),
      dificuldade: clamp10(parsed.dificuldade),
      retorno: clamp10(parsed.retorno),
      complexidade_dev: clamp10(parsed.complexidade_dev),
      justificativa:
        typeof parsed.justificativa === "string" && parsed.justificativa.trim()
          ? parsed.justificativa.trim().slice(0, 500)
          : "Estimativa gerada com base na descrição fornecida.",
    };

    return new Response(JSON.stringify(resposta), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("triagem-demanda error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
