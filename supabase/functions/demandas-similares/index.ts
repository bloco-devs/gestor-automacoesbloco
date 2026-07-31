import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

type Body = { titulo?: string; descricao?: string; excluirId?: string };
type Candidato = { id: string; titulo: string; descricao: string | null; status: string | null; setor: string | null };

const MAX_CANDIDATOS = 60;
const MAX_DESC_CHARS = 300;
const MIN_SIMILARIDADE = 60;
const MAX_RESULTADOS = 3;

const SYSTEM = `Você compara uma DEMANDA CANDIDATA com uma LISTA de demandas já existentes e identifica as mais parecidas (mesmo problema/processo, mesmo objetivo de automação), em PT-BR. Devolva APENAS um JSON, sem texto fora:
{
  "similares": [
    { "id": "<id exato da lista>", "titulo": "<titulo>", "similaridade": <0-100 inteiro>, "motivo": "<1 frase curta>" }
  ]
}
Regras: NO MÁXIMO ${MAX_RESULTADOS} itens; só inclua itens realmente plausíveis (similaridade ≥ ${MIN_SIMILARIDADE}); use SOMENTE ids que aparecem na lista; se nenhuma for parecida, retorne { "similares": [] }. Nada além do JSON.`;

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

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function truncar(s: string | null | undefined, n: number): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const titulo = (body.titulo ?? "").trim();
    const descricao = (body.descricao ?? "").trim();
    const excluirId = (body.excluirId ?? "").trim();

    if (!descricao || descricao.length < 10) {
      return new Response(
        JSON.stringify({ error: "Descreva a demanda com mais detalhes para a busca." }),
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

    // Recuperar candidatos (LIMITADO).
    let query = svc
      .from("solicitacoes")
      .select("id, titulo, descricao, status, setor")
      .order("created_at", { ascending: false })
      .limit(MAX_CANDIDATOS);
    if (excluirId) query = query.neq("id", excluirId);
    const { data: candidatos, error: candErr } = await query;
    if (candErr) {
      console.error("demandas-similares: erro buscando candidatos:", candErr.message);
      return new Response(JSON.stringify({ similares: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lista = (candidatos ?? []) as Candidato[];
    if (lista.length === 0) {
      return new Response(JSON.stringify({ similares: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idsValidos = new Set(lista.map((c) => c.id));
    const tituloPorId = new Map(lista.map((c) => [c.id, c.titulo] as const));

    const listaTxt = lista
      .map((c, i) => `#${i + 1} id=${c.id} | título: ${c.titulo}${c.setor ? ` | setor: ${c.setor}` : ""}\n   descrição: ${truncar(c.descricao, MAX_DESC_CHARS)}`)
      .join("\n");

    const userMsg = `DEMANDA CANDIDATA:
título: ${titulo || "(sem título)"}
descrição: ${truncar(descricao, MAX_DESC_CHARS * 2)}

LISTA DE DEMANDAS EXISTENTES (${lista.length}):
${listaTxt}`;

    const data = await callAI(
      {
        model: modeloPara("apoio"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      },
      { acao: "demandas-similares", userId },
    ) as any;

    const raw: string = data.choices?.[0]?.message?.content ?? "";
    let parsed: { similares?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }

    const rawArr = Array.isArray(parsed.similares) ? parsed.similares : [];
    const similares = rawArr
      .map((it: any) => {
        const id = typeof it?.id === "string" ? it.id : "";
        if (!id || !idsValidos.has(id)) return null;
        const similaridade = clampInt(it?.similaridade, 0, 100);
        if (similaridade < MIN_SIMILARIDADE) return null;
        const motivo = typeof it?.motivo === "string" ? it.motivo.trim().slice(0, 240) : "";
        return {
          id,
          titulo: tituloPorId.get(id) ?? (typeof it?.titulo === "string" ? it.titulo : ""),
          similaridade,
          motivo,
        };
      })
      .filter(Boolean)
      .slice(0, MAX_RESULTADOS);

    return new Response(JSON.stringify({ similares }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("demandas-similares error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
