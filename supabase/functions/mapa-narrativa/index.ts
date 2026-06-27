import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const MAX_SOLUCOES = 40;
const MAX_CONEXOES = 60;
const MAX_COLUNAS = 8;
const MAX_SAUDE = 10;
const MAX_OBS = 12;

const SYSTEM = `Você é um arquiteto de soluções analisando um diagrama de integrações de sistemas internos. Escreva em PT-BR, texto corrido (sem markdown pesado, sem títulos com #), estrutura:

Explicação do diagrama: 1-2 parágrafos curtos descrevendo o que o mapa representa e as principais relações.
Riscos e observações: 2-4 bullets curtos (use "- "). Se houver dados de SAUDE ou OBSERVACOES no payload, PRIORIZE-OS: cite nomes e porcentagens de falha, sistemas/conectores desativado/catálogo/inativo, e pontos únicos de falha (conectores com muitos consumidores). Caso contrário, aponte soluções sem conexão e acoplamentos suspeitos.
Conexões/integrações que poderiam faltar: 2-3 bullets curtos sugerindo integrações plausíveis com base no que já existe.

Não invente nomes que não estejam na lista. Seja específico e prático.`;

interface SolucaoIn {
  titulo: string;
  solicitacaoTitulo?: string | null;
}

interface ConexaoColunaIn {
  nome: string;
  tipo: string;
}

interface ConexaoIn {
  origem: string;
  destino: string;
  label?: string | null;
  colunas?: ConexaoColunaIn[];
}

interface Payload {
  solucoes: SolucaoIn[];
  conexoes: ConexaoIn[];
  saude?: Array<{ nome: string; execs: number; falhas: number; taxa: number; ultima?: string | null }>;
  observacoes?: string[];
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

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function sanitize(payload: unknown): Payload {
  const p = (payload ?? {}) as Partial<Payload>;
  const solucoes = Array.isArray(p.solucoes) ? p.solucoes : [];
  const conexoes = Array.isArray(p.conexoes) ? p.conexoes : [];
  return {
    solucoes: solucoes.slice(0, MAX_SOLUCOES).map((s) => ({
      titulo: String(s?.titulo ?? "").slice(0, 120),
      solicitacaoTitulo: s?.solicitacaoTitulo ? String(s.solicitacaoTitulo).slice(0, 160) : null,
    })),
    conexoes: conexoes.slice(0, MAX_CONEXOES).map((c) => ({
      origem: String(c?.origem ?? "").slice(0, 120),
      destino: String(c?.destino ?? "").slice(0, 120),
      label: c?.label ? String(c.label).slice(0, 120) : null,
      colunas: Array.isArray(c?.colunas)
        ? c.colunas.slice(0, MAX_COLUNAS).map((col) => ({
            nome: String(col?.nome ?? "").slice(0, 60),
            tipo: String(col?.tipo ?? "").slice(0, 30),
          }))
        : undefined,
    })),
  };
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

    const body = await req.json().catch(() => ({}));
    const resumo = sanitize(body);

    if (resumo.solucoes.length === 0) {
      return new Response(
        JSON.stringify({
          narrativa:
            "O mapa ainda não possui soluções cadastradas. Cadastre soluções e conexões para gerar uma narrativa.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userMsg = `RESUMO DO MAPA ATUAL (limitado em tamanho):
${JSON.stringify(resumo, null, 2)}`;

    const data = (await callAI(
      {
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
      },
      { acao: "mapa-narrativa", userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    )) as any;

    const narrativa: string = data.choices?.[0]?.message?.content?.trim() ?? "";

    return new Response(
      JSON.stringify({ narrativa, gerado_em: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const status = e instanceof IAUsageError ? e.status : 500;
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("mapa-narrativa error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
