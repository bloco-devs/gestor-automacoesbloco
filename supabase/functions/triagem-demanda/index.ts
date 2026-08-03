import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, IAUsageError } from "../_shared/ia-gateway.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { modeloPara } from "../_shared/modelos.ts";
import { SISTEMAS_CONHECIDOS } from "../_shared/vocabulario.ts";

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
/**
 * O vocabulário de `_shared/vocabulario.ts` entra aqui.
 *
 * Este mapa e aquele arquivo respondem a mesma pergunta — quais palavras
 * apontam para qual sistema — e estavam separados, cada um com metade da
 * resposta. `ritual` estava num e nao no outro, entao a triagem nao reconhecia
 * o que a conversa reconhecia.
 *
 * A juncao acontece em tempo de execucao, e nao por copia: manter duas listas
 * sincronizadas a mao e como esse defeito nasce.
 *
 * Aqui o casamento e por REGEX, nao por modelo. Quando a palavra aparece, o
 * sistema e identificado sem gastar uma chamada de IA e sem chance de
 * alucinacao. O modelo so decide o que o texto nao entrega.
 */
const APELIDOS_BASE: Record<string, string[]> = {
  rh: ["rh", "recursos humanos", "recurso humano", "departamento pessoal", "dp", "folha", "folha de pagamento", "admissao", "admissoes", "ferias", "colaboradores"],
  processos: ["processos", "processo", "sgpo"],
  obra: ["obra", "obras", "canteiro", "canteiro de obras"],
  suprimentos: ["suprimentos", "compras", "almoxarifado", "estoque"],
  financeiro: ["financeiro", "financas", "contas a pagar", "contas a receber", "tesouraria"],
  "gestao-comercial": ["comercial", "vendas"],
  "crm-house": ["crm"],
  portfolio: ["portfolio", "empreendimentos"],
  incorporacao: ["incorporacao", "incorporadora"],
  "gestao-projetos": ["projetos", "projeto"],
  nakhon: ["contratos", "contrato", "nakhon"],
  atividades: ["atividades", "quadro", "kanban"],
  automacoes: ["automacoes", "automacao", "gestor de automacoes"],
  viabuilder: ["viabuilder", "viabilidade"],
  "hub-bloco-id": ["bloco id", "hub", "sso", "login"],
};

/** Escapa metacaracteres para uso dentro de RegExp. */
function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex robusta com fronteiras de palavra e case-insensitive.
 * Opera sobre o texto normalizado (sem acento), então os termos
 * também são normalizados antes de compor o padrão.
 */
function construirRegex(termos: string[]): RegExp | null {
  const partes = termos
    .map((t) => normalizar(t))
    .filter((t) => t.length >= 2)
    .map((t) => escaparRegex(t).replace(/\s+/g, "\\s+"));
  if (!partes.length) return null;
  // \b funciona porque o texto normalizado só tem [a-z0-9\s].
  return new RegExp(`\\b(?:${partes.join("|")})\\b`, "i");
}

/**
 * Rede de segurança determinística: quando o LLM devolve null, infere o sistema
 * a partir do texto (slug, nome cadastrado ou apelido conhecido) via regex.
 * Com múltiplos candidatos, vence o de casamento mais longo (mais específico);
 * empate real continua null.
 */
function inferirSistema(
  texto: string,
  sistemas: Array<{ slug: string; nome: string }>,
): { slug: string | null; candidatos: Array<{ slug: string; termo: string }> } {
  const norm = normalizar(texto);
  const candidatos: Array<{ slug: string; termo: string }> = [];

  for (const s of sistemas) {
    const termos = [s.slug.replace(/-/g, " "), s.nome, ...(APELIDOS[s.slug] ?? [])];
    const re = construirRegex(termos);
    if (!re) continue;
    const m = norm.match(re);
    if (m) candidatos.push({ slug: s.slug, termo: m[0] });
  }

  if (!candidatos.length) return { slug: null, candidatos };

  const unicos = new Set(candidatos.map((c) => c.slug));
  if (unicos.size === 1) return { slug: candidatos[0].slug, candidatos };

  // Desempate: termo casado mais longo (ex.: "recursos humanos" > "rh").
  const ordenados = [...candidatos].sort((a, b) => b.termo.length - a.termo.length);
  if (ordenados[0].termo.length > ordenados[1].termo.length) {
    return { slug: ordenados[0].slug, candidatos };
  }
  return { slug: null, candidatos };
}



/** Funde os apelidos locais com o vocabulario compartilhado. */
const APELIDOS: Record<string, string[]> = (() => {
  const juntos: Record<string, string[]> = {};
  for (const [slug, termos] of Object.entries(APELIDOS_BASE)) {
    juntos[slug] = [...termos];
  }
  for (const s of SISTEMAS_CONHECIDOS) {
    const atuais = juntos[s.slug] ?? [];
    const novos = s.palavras.map((p) => p.toLowerCase());
    juntos[s.slug] = Array.from(new Set([...atuais, ...novos]));
  }
  return juntos;
})();

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
        grupo: String(s?.grupo ?? "").trim(),
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
      ? `\nSISTEMAS (escolha EXATAMENTE um destes slugs em sistema_alvo_slug):\n${sistemas
          .map((s) => `- ${s.slug} — ${s.nome}${s.grupo ? ` (área: ${s.grupo})` : ""}`)
          .join("\n")}\nLembrete: se o texto mencionar qualquer uma dessas áreas ou sistemas (mesmo por sigla ou apelido), devolva o slug correspondente em vez de null.`
      : `\nSISTEMAS: (não fornecidos — devolva tipo_demanda e sistema_alvo_slug como null)`;


    const userMsg = `TÍTULO: ${titulo || "(sem título)"}
SETOR: ${setor || "(não informado)"}
DESCRIÇÃO:
${descricao}${sistemasBloco}`;

    console.log("[triagem-demanda] entrada:", JSON.stringify({
      titulo,
      setor,
      descricao: descricao.slice(0, 500),
      sistemas: sistemas.map((s) => s.slug),
      totalSistemas: sistemas.length,
    }));

    const data = await callAI(
      {
        model: modeloPara("triagem"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      },
      { acao: "triagem-demanda", userId },
    ) as any;

    const raw: string = data.choices?.[0]?.message?.content ?? "";
    console.log("[triagem-demanda] resposta bruta do LLM:", raw.slice(0, 1500));
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
    let tipo_demanda = tipoRaw && TIPOS_VALIDOS.has(tipoRaw) ? tipoRaw : null;

    const slugRaw = typeof parsed.sistema_alvo_slug === "string" ? parsed.sistema_alvo_slug.trim() : null;
    let sistema_alvo_slug: string | null =
      slugRaw && slugsValidos.has(slugRaw) ? slugRaw : null;

    if (slugRaw && !sistema_alvo_slug) {
      console.log(`[triagem-demanda] LLM devolveu slug fora da lista: "${slugRaw}" (descartado)`);
    }

    // Um sistema válido não é descartado por erro de tipo: se o modelo apontou
    // "novo_sistema" mas indicou um sistema existente, o caso real é novo módulo.
    if (sistema_alvo_slug && tipo_demanda === "novo_sistema") {
      tipo_demanda = "novo_modulo";
    }

    // Rede de segurança determinística — só quando o LLM não identificou nada.
    let inferido = false;
    if (!sistema_alvo_slug && sistemas.length) {
      const { slug: palpite, candidatos } = inferirSistema(
        `${titulo} ${descricao} ${setor}`,
        sistemas,
      );
      console.log("[triagem-demanda] fallback regex acionado:", JSON.stringify({
        candidatos,
        escolhido: palpite,
      }));
      if (palpite) {
        sistema_alvo_slug = palpite;
        inferido = true;
        if (!tipo_demanda || tipo_demanda === "novo_sistema") tipo_demanda = "novo_modulo";
      }
    }

    console.log("[triagem-demanda] sistema final:", sistema_alvo_slug, "| inferido:", inferido);


    const justificativaBase =
      typeof parsed.justificativa === "string" && parsed.justificativa.trim()
        ? parsed.justificativa.trim().slice(0, 500)
        : "Estimativa gerada com base na descrição fornecida.";

    const resposta = {
      frequencia: clamp10(parsed.frequencia),
      dificuldade: clamp10(parsed.dificuldade),
      retorno: clamp10(parsed.retorno),
      complexidade_dev: clamp10(parsed.complexidade_dev),
      tipo_demanda,
      sistema_alvo_slug,
      justificativa: inferido
        ? `${justificativaBase} Sistema identificado pela menção direta no texto da demanda.`.slice(0, 600)
        : justificativaBase,
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
