import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

type SistemaItem = { slug?: string; id?: string; nome?: string; grupo?: string | null };
type Body = { titulo?: string; descricao?: string; setor?: string; sistemas?: SistemaItem[] };

const SYSTEM = `Você é um analista de priorização de demandas de automação interna na escala 0-10 para CADA fator. Devolva APENAS um objeto JSON, sem texto fora do JSON, com EXATAMENTE estes campos:
{
  "frequencia": number,        // 0-10. 0=Nunca, 2=Raro (<1×/mês), 4=Mensal, 6=Semanal, 8=Diário, 10=Várias vezes/dia
  "dificuldade": number,       // 0-10. 0=Trivial, 2=Fácil, 4=Moderada, 6=Difícil, 8=Muito difícil, 10=Crítica
  "retorno": number,           // 0-10. Retorno financeiro mensal. 0=Nenhum, 2=R$0-500, 4=R$500-2,5k, 6=R$2,5k-10k, 8=R$10k-50k, 10=R$50k+
  "complexidade_dev": number,  // 0-10. Estimativa de complexidade TÉCNICA de implementar. 0=trivial automação, 10=projeto longo/integração crítica
  "tipo_demanda": "ajuste_existente" | "novo_modulo" | "novo_sistema" | null,
  "sistema_alvo_slug": string | null,   // DEVE ser um slug exato da lista de sistemas fornecida
  "justificativa": string      // 1-2 frases curtas em PT-BR explicando a estimativa e a classificação (tipo/sistema)
}
Regras de classificação:
- "ajuste_existente": melhoria/correção em capacidade que provavelmente já existe em um sistema do ecossistema.
- "novo_modulo": capacidade NOVA dentro de um sistema já existente (escolha o sistema-alvo).
- "novo_sistema": não cabe em NENHUM sistema do ecossistema.

IDENTIFICAÇÃO DO SISTEMA (campo sistema_alvo_slug) — regra prioritária:
- Analise o texto do usuário para identificar o sistema ou a área afetada (ex.: RH, Recursos Humanos, Processos, Obras, Suprimentos, Financeiro, Comercial, Projetos, Contratos, Portfólio) e mapeie para o slug MAIS PRÓXIMO da lista SISTEMAS.
- O campo sistema_alvo_slug NÃO DEVE ser null se houver QUALQUER menção a uma área, setor, processo ou software que corresponda a um item da lista.
- O casamento é semântico, não literal: sigla, nome parcial, sinônimo e nome do setor valem. Exemplos: "RH"/"recursos humanos"/"folha"/"admissão" → o slug de RH; "obra"/"obras"/"canteiro" → o slug de obra; "SGPO"/"processo" → o slug de processos; "compras" → suprimentos; "vendas" → comercial.
- Só use null quando a demanda realmente não tiver relação com nenhum sistema da lista.
- NUNCA invente slug fora da lista SISTEMAS.
- Se a lista de SISTEMAS não foi fornecida, defina tipo_demanda e sistema_alvo_slug como null.
Regras gerais: números inteiros entre 0 e 10. Se a descrição for vaga, escolha valores medianos plausíveis e diga isso na justificativa. Nada além do JSON.`;

/** Normaliza para comparação: minúsculas, sem acento, sem pontuação. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Apelidos comuns por slug conhecido do ecossistema. */
const APELIDOS: Record<string, string[]> = {
  rh: ["rh", "recursos humanos", "departamento pessoal", "folha", "admissao", "ferias"],
  processos: ["processos", "processo", "sgpo"],
  obra: ["obra", "obras", "canteiro"],
  suprimentos: ["suprimentos", "compras", "almoxarifado"],
  financeiro: ["financeiro", "financas", "contas a pagar", "contas a receber"],
  "gestao-comercial": ["comercial", "vendas"],
  "crm-house": ["crm"],
  portfolio: ["portfolio", "empreendimentos"],
  incorporacao: ["incorporacao"],
  "gestao-projetos": ["projetos"],
  nakhon: ["contratos", "nakhon"],
  atividades: ["atividades", "quadro", "kanban"],
  automacoes: ["automacoes", "gestor de automacoes"],
  viabuilder: ["viabuilder", "viabilidade"],
  "hub-bloco-id": ["bloco id", "hub", "sso", "login"],
};

/** Contém o termo como palavra inteira. */
function mencionado(textoNorm: string, termo: string): boolean {
  const t = normalizar(termo);
  if (!t || t.length < 2) return false;
  return new RegExp(`(^|\\s)${t.replace(/\s+/g, "\\s+")}($|\\s)`).test(textoNorm);
}

/**
 * Rede de segurança: quando o LLM devolve null, tenta inferir o sistema
 * a partir do texto (slug, nome cadastrado ou apelido conhecido).
 * Só decide quando há exatamente um candidato — ambiguidade continua null.
 */
function inferirSistema(
  texto: string,
  sistemas: Array<{ slug: string; nome: string }>,
): string | null {
  const norm = normalizar(texto);
  const candidatos = new Set<string>();
  for (const s of sistemas) {
    const termos = [s.slug.replace(/-/g, " "), s.nome, ...(APELIDOS[s.slug] ?? [])];
    if (termos.some((t) => mencionado(norm, t))) candidatos.add(s.slug);
  }
  return candidatos.size === 1 ? [...candidatos][0] : null;
}


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
    const sistemasInput = Array.isArray(body.sistemas) ? body.sistemas : [];
    const sistemas = sistemasInput
      .map((s) => ({
        slug: String(s?.slug ?? s?.id ?? "").trim(),
        nome: String(s?.nome ?? "").trim(),
      }))
      .filter((s) => s.slug && s.nome)
      .slice(0, 60);
    const slugsValidos = new Set(sistemas.map((s) => s.slug));

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

    const sistemasBloco = sistemas.length
      ? `\nSISTEMAS (use APENAS um destes slugs em sistema_alvo_slug, ou null):\n${sistemas
          .map((s) => `- ${s.slug} — ${s.nome}`)
          .join("\n")}`
      : `\nSISTEMAS: (não fornecidos — devolva tipo_demanda e sistema_alvo_slug como null)`;

    const userMsg = `TÍTULO: ${titulo || "(sem título)"}
SETOR: ${setor || "(não informado)"}
DESCRIÇÃO:
${descricao}${sistemasBloco}`;

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

    const TIPOS_VALIDOS = new Set(["ajuste_existente", "novo_modulo", "novo_sistema"]);
    const tipoRaw = typeof parsed.tipo_demanda === "string" ? parsed.tipo_demanda.trim() : null;
    const tipo_demanda = tipoRaw && TIPOS_VALIDOS.has(tipoRaw) ? tipoRaw : null;

    const slugRaw = typeof parsed.sistema_alvo_slug === "string" ? parsed.sistema_alvo_slug.trim() : null;
    let sistema_alvo_slug: string | null = null;
    if (slugRaw && slugsValidos.has(slugRaw) && tipo_demanda !== "novo_sistema") {
      sistema_alvo_slug = slugRaw;
    }

    const resposta = {
      frequencia: clamp10(parsed.frequencia),
      dificuldade: clamp10(parsed.dificuldade),
      retorno: clamp10(parsed.retorno),
      complexidade_dev: clamp10(parsed.complexidade_dev),
      tipo_demanda,
      sistema_alvo_slug,
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
