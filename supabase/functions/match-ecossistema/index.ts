// Onda B2 — match-ecossistema: sugere sistemas/módulos do ecossistema que já
// oferecem a funcionalidade pedida. Lê o catálogo do HUB (read-only) e usa IA
// via _shared/ia-gateway.ts. Não escreve nada. Sem UI nesta onda.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

type Body = {
  titulo?: string;
  descricao?: string;
  tipo_demanda?: string | null;
  sistema_alvo_slug?: string | null;
};

type SistemaBase = {
  slug: string;
  nome: string;
  url_app: string | null;
  resumo: string;
  modulos: string[];
};

const SYSTEM = `Você é um analista do ecossistema interno. Receberá uma DEMANDA e uma lista de SISTEMAS (com resumo e módulos). Sua tarefa: indicar quais sistemas/módulos JÁ oferecem essa funcionalidade, para evitar retrabalho.
Devolva APENAS um objeto JSON, sem texto fora do JSON, EXATAMENTE neste formato:
{
  "candidatos": [
    { "sistema_slug": "<slug exato da lista>", "modulo": "<nome do módulo/área ou null>", "confianca": 0-100, "justificativa": "1 frase curta em PT-BR" }
  ]
}
Regras:
- sistema_slug DEVE ser um slug presente na lista enviada. NUNCA invente.
- Máximo 3 candidatos. Só inclua candidatos com confianca >= 60.
- Se a demanda apontou um sistema-alvo, AVALIE-O primeiro e priorize-o se realmente couber.
- Se nada casar com confiança suficiente, devolva "candidatos": [].
- Nada além do JSON.`;

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

function trunc(s: unknown, max: number): string {
  const v = typeof s === "string" ? s : "";
  return v.length > max ? v.slice(0, max - 1) + "…" : v;
}

function clampConf(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function ok(body: unknown, cors: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function fetchCatalogo(): Promise<any | null> {
  if (!HUB_URL || !HUB_TOKEN) return null;
  try {
    const resp = await fetch(`${HUB_URL}/functions/v1/ecossistema-catalogo`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      await resp.text().catch(() => "");
      return null;
    }
    return await resp.json();
  } catch {
    return null;
  }
}

function extrairModulos(descritor: any): string[] {
  const mods = Array.isArray(descritor?.modulos) ? descritor.modulos : [];
  const nomes: string[] = [];
  for (const m of mods) {
    if (!m) continue;
    if (typeof m === "string") nomes.push(m);
    else if (typeof m === "object") {
      const n = m.nome ?? m.titulo ?? m.name ?? m.slug;
      if (typeof n === "string" && n.trim()) nomes.push(n.trim());
    }
    if (nomes.length >= 10) break;
  }
  return nomes;
}

function montarBase(catalogo: any): SistemaBase[] {
  const sistemas: any[] = Array.isArray(catalogo?.sistemas) ? catalogo.sistemas : [];
  const descritores: any[] = Array.isArray(catalogo?.descritores) ? catalogo.descritores : [];
  const descBySlug = new Map<string, any>();
  for (const d of descritores) {
    const slug = d?.sistema_slug ? String(d.sistema_slug) : null;
    const desc = d?.descritor ?? d;
    if (slug) descBySlug.set(slug, desc);
  }
  const out: SistemaBase[] = [];
  for (const s of sistemas) {
    const slug = s?.slug ? String(s.slug) : null;
    const nome = s?.nome ? String(s.nome) : null;
    if (!slug || !nome) continue;
    const desc = descBySlug.get(slug) ?? {};
    const resumo = trunc(desc?.resumo ?? s?.descricao ?? "", 400);
    out.push({
      slug,
      nome,
      url_app: s?.url_app ? String(s.url_app) : null,
      resumo,
      modulos: extrairModulos(desc),
    });
  }
  return out;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const titulo = (body.titulo ?? "").trim();
    const descricao = (body.descricao ?? "").trim();
    const tipo = (body.tipo_demanda ?? "").toString().trim() || null;
    const alvo = (body.sistema_alvo_slug ?? "").toString().trim() || null;

    if (!descricao || descricao.length < 10) {
      return ok({ error: "Descreva a demanda com mais detalhes." }, corsHeaders, 400);
    }

    const userId = await getUserIdFromAuth(req);
    const svc = getServiceClient();
    const rl = await checkRateLimit(svc, userId);
    if (!rl.permitido) {
      return ok({ error: "Muitas solicitações à IA. Aguarde alguns instantes." }, corsHeaders, 429);
    }

    const catalogo = await fetchCatalogo();
    if (!catalogo) {
      return ok(
        { candidatos: [], fonte: "indisponivel", gerado_em: new Date().toISOString() },
        corsHeaders,
      );
    }

    const base = montarBase(catalogo);
    if (base.length === 0) {
      return ok(
        { candidatos: [], fonte: "hub", gerado_em: new Date().toISOString() },
        corsHeaders,
      );
    }
    const baseBySlug = new Map(base.map((b) => [b.slug, b]));

    const listaTxt = base
      .map((b) => {
        const mods = b.modulos.length ? ` | módulos: ${b.modulos.join(", ")}` : "";
        return `- ${b.slug} — ${b.nome}: ${b.resumo || "(sem resumo)"}${mods}`;
      })
      .join("\n");

    const userMsg = `DEMANDA:
TÍTULO: ${titulo || "(sem título)"}
TIPO: ${tipo ?? "(não classificado)"}
SISTEMA-ALVO SUGERIDO: ${alvo ?? "(nenhum)"}
DESCRIÇÃO:
${descricao}

SISTEMAS DISPONÍVEIS (use APENAS estes slugs):
${listaTxt}`;

    let data: any;
    try {
      data = await callAI(
        {
          model: modeloPara("triagem"),
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
        },
        { acao: "match-ecossistema", userId },
      );
    } catch (e) {
      if (e instanceof IAUsageError) throw e;
      // qualquer outra falha de IA: devolve vazio, não derruba.
      return ok(
        { candidatos: [], fonte: "hub", gerado_em: new Date().toISOString() },
        corsHeaders,
      );
    }

    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { parsed = {}; }
      }
    }

    const candidatosRaw: any[] = Array.isArray(parsed?.candidatos) ? parsed.candidatos : [];
    const validados = candidatosRaw
      .map((c) => {
        const slug = typeof c?.sistema_slug === "string" ? c.sistema_slug.trim() : "";
        const base = baseBySlug.get(slug);
        if (!base) return null;
        const conf = clampConf(c?.confianca);
        if (conf < 60) return null;
        const moduloRaw = typeof c?.modulo === "string" ? c.modulo.trim() : "";
        const justRaw = typeof c?.justificativa === "string" ? c.justificativa.trim() : "";
        return {
          sistema_slug: base.slug,
          nome: base.nome,
          modulo: moduloRaw || null,
          url_app: base.url_app,
          confianca: conf,
          justificativa: justRaw ? justRaw.slice(0, 300) : "Funcionalidade compatível com o sistema.",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // dedup por slug, mantém maior confiança
    const dedup = new Map<string, typeof validados[number]>();
    for (const c of validados) {
      const prev = dedup.get(c.sistema_slug);
      if (!prev || c.confianca > prev.confianca) dedup.set(c.sistema_slug, c);
    }
    const candidatos = Array.from(dedup.values())
      .sort((a, b) => b.confianca - a.confianca)
      .slice(0, 3);

    return ok(
      { candidatos, fonte: "hub", gerado_em: new Date().toISOString() },
      corsHeaders,
    );
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("match-ecossistema error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
