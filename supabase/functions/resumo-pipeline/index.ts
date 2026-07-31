import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  em_desenvolvimento: "Em Desenvolvimento",
  testando: "Testando",
  pronto: "Pronto",
  em_producao: "Em Produção",
};
const ABERTOS = ["novo", "em_analise", "aprovado", "em_desenvolvimento", "testando"];

const SYSTEM = `Você é um analista de operações. Escreva um RESUMO EXECUTIVO curto, em PT-BR, com base nos NÚMEROS fornecidos sobre um pipeline de demandas de automação interna. Estrutura (texto corrido, sem markdown pesado):

Visão geral: um parágrafo curto (2-3 frases).
Pontos de atenção: 2-4 bullets curtos sobre gargalos/itens parados.
Próximos passos sugeridos: 2-3 bullets curtos e práticos.

Use os bullets como "- ...". Nada de tabelas, nada de títulos em #. Não invente números — use só os fornecidos.`;

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

function diasDesde(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req);
    const svc = getServiceClient();

    const rl = await checkRateLimit(svc, userId);
    if (!rl.permitido) {
      return new Response(
        JSON.stringify({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Contagem por status (agregação por contagem com head).
    const contagem: Record<string, number> = {};
    await Promise.all(
      Object.keys(STATUS_LABEL).map(async (st) => {
        const { count } = await svc
          .from("solicitacoes")
          .select("id", { count: "exact", head: true })
          .eq("status", st);
        contagem[st] = count ?? 0;
      }),
    );
    const total = Object.values(contagem).reduce((a, b) => a + b, 0);

    // 2) Parados: abertos com updated_at antigo (>7d e >14d).
    const seteDias = new Date(Date.now() - 7 * 86400000).toISOString();
    const quatorzeDias = new Date(Date.now() - 14 * 86400000).toISOString();
    const [{ count: parados7 }, { count: parados14 }] = await Promise.all([
      svc.from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .in("status", ABERTOS)
        .lt("updated_at", seteDias),
      svc.from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .in("status", ABERTOS)
        .lt("updated_at", quatorzeDias),
    ]);

    // 3) Top 5 abertos mais antigos.
    const { data: antigos } = await svc
      .from("solicitacoes")
      .select("id, titulo, status, created_at")
      .in("status", ABERTOS)
      .order("created_at", { ascending: true })
      .limit(5);
    const antigosFmt = (antigos ?? []).map((s) => ({
      titulo: s.titulo,
      status: STATUS_LABEL[s.status] ?? s.status,
      dias_aberto: diasDesde(s.created_at as string),
    }));

    const numeros = {
      total,
      por_status: Object.fromEntries(
        Object.entries(contagem).map(([k, v]) => [STATUS_LABEL[k] ?? k, v]),
      ),
      parados_mais_de_7_dias: parados7 ?? 0,
      parados_mais_de_14_dias: parados14 ?? 0,
      abertos_mais_antigos: antigosFmt,
    };

    const userMsg = `NÚMEROS DO PIPELINE (em ${new Date().toISOString()}):
${JSON.stringify(numeros, null, 2)}`;

    const data = await callAI(
      {
        model: modeloPara("apoio"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      },
      { acao: "resumo-pipeline", userId },
    ) as any;

    const resumo: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(
      JSON.stringify({ resumo, gerado_em: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("resumo-pipeline error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
