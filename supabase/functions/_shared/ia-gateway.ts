// Helper central de IA: tenta o conector `lovable-ai` do HUB Bloco ID;
// se não houver secrets do HUB ou se ocorrer erro de infraestrutura, cai
// para o caminho direto (ai.gateway.lovable.dev). Erros de uso da IA
// (429 limite, 402 créditos) são propagados — NÃO acionam fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

/**
 * OPENROUTER COMO CAMINHO PRINCIPAL — QUANDO A CHAVE EXISTIR
 *
 * A escolha de modelo só é real se houver de onde escolher. Pelo gateway da
 * Lovable, o catálogo é o que ela oferecer, o custo por chamada não aparece,
 * e não há como declarar um segundo modelo caso o primeiro falhe.
 *
 * A ATIVAÇÃO É A PRESENÇA DA CHAVE, E ISSO É DE PROPÓSITO
 * Sem `OPENROUTER_API_KEY`, nada nesta mudança acontece: o caminho antigo
 * continua exatamente como estava. Com a chave, o OpenRouter passa a ser
 * tentado primeiro. Não há flag para lembrar de ligar nem passo de migração
 * — e, se algo der errado, apagar o secret devolve o sistema ao estado
 * anterior em segundos, sem deploy.
 *
 * Isso importa porque esta é a única parte do sistema que, se cair, deixa o
 * solicitante sem conseguir abrir uma demanda.
 */
const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";

export class IAUsageError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "IAUsageError";
    this.status = status;
  }
}

export type IACallContext = {
  acao?: string;
  userId?: string | null;
};

function mapUsageStatus(status: number): string | null {
  if (status === 429) return "Limite de requisições atingido. Tente novamente em instantes.";
  if (status === 402) return "Créditos de IA esgotados. Adicione créditos em Configurações.";
  return null;
}

// Chamada direta ao gateway Lovable (comportamento original / fallback).
async function callDireto(body: unknown): Promise<unknown> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY não configurado");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    const usageMsg = mapUsageStatus(resp.status);
    if (usageMsg) throw new IAUsageError(resp.status, usageMsg);
    throw new Error(`Erro IA (${resp.status}): ${text}`);
  }
  return await resp.json();
}

// Chamada direta ao OpenRouter. Mesmo formato de payload (OpenAI chat), então
// nenhuma das oito funções precisa saber que o caminho mudou.
async function callOpenRouter(body: unknown): Promise<unknown> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      // O OpenRouter usa estes dois para atribuir a chamada. Não são
      // obrigatórios, mas sem eles o painel de uso vira uma lista anônima —
      // e o objetivo de sair da Lovable era justamente enxergar o consumo.
      "HTTP-Referer": "https://gestor.grupobloco.com.br",
      "X-Title": "Gestor de Automacoes",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    const usageMsg = mapUsageStatus(resp.status);
    // Limite e crédito são erros de USO: a Lovable também os teria. Cair para
    // ela seria gastar o crédito do outro lado por um problema que é de
    // consumo, não de infraestrutura — e esconder do usuário a causa real.
    if (usageMsg) throw new IAUsageError(resp.status, usageMsg);
    throw new Error(`OPENROUTER_INFRA_${resp.status}:${text}`);
  }
  return await resp.json();
}

// Chamada via conector central `lovable-ai` do HUB (api-gateway).
async function callHub(body: unknown): Promise<unknown> {
  const resp = await fetch(`${HUB_URL}/functions/v1/api-gateway/lovable-ai/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Erros de USO da IA (upstream Lovable): propaga, não cai para o direto.
  const usageMsg = mapUsageStatus(resp.status);
  if (usageMsg) throw new IAUsageError(resp.status, usageMsg);

  // Erros de infraestrutura do gateway (401/403/424/503 etc.): sinaliza fallback.
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`HUB_GATEWAY_INFRA_${resp.status}:${text}`);
  }

  return await resp.json();
}

// Logging best-effort em `ia_uso_log` via service role. Nunca lança.
async function logUso(params: {
  acao?: string;
  modelo?: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
  status: "ok" | "erro" | "limite";
  userId?: string | null;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return;
    const svc = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await svc.from("ia_uso_log").insert({
      acao: params.acao ?? null,
      modelo: params.modelo ?? null,
      tokens_in: params.tokensIn ?? null,
      tokens_out: params.tokensOut ?? null,
      status: params.status,
      user_id: params.userId ?? null,
    });
  } catch (e) {
    console.error("ia-gateway: falha ao gravar ia_uso_log:", e instanceof Error ? e.message : String(e));
  }
}

function extrairModelo(body: unknown): string | undefined {
  if (body && typeof body === "object" && "model" in body) {
    const m = (body as { model?: unknown }).model;
    if (typeof m === "string") return m;
  }
  return undefined;
}

function extrairUsage(data: unknown): { in?: number; out?: number } {
  if (data && typeof data === "object" && "usage" in data) {
    const u = (data as { usage?: Record<string, unknown> }).usage ?? {};
    const tin = typeof u.prompt_tokens === "number" ? u.prompt_tokens : undefined;
    const tout = typeof u.completion_tokens === "number" ? u.completion_tokens : undefined;
    return { in: tin, out: tout };
  }
  return {};
}

// Ponto de entrada único. Body = payload OpenAI chat verbatim; retorna o JSON tal qual.
export async function callAI(body: unknown, ctx: IACallContext = {}): Promise<unknown> {
  const modelo = extrairModelo(body);
  const temHub = Boolean(HUB_URL && HUB_TOKEN);

  /**
   * A ordem: OpenRouter, depois o caminho que já existia.
   *
   * A reserva cobre falha de INFRAESTRUTURA do OpenRouter — fora do ar, DNS,
   * 5xx. Não cobre limite nem crédito: esses sobem direto, porque tentar de
   * novo no outro provedor apenas gastaria o crédito de lá pelo mesmo motivo,
   * e mostraria ao usuário um erro que não descreve o que houve.
   *
   * O modelo pedido vai junto na reserva. Se o nome não existir no catálogo
   * da Lovable, ela responde erro e o usuário vê a falha — que é melhor do
   * que uma resposta silenciosa de um modelo que ninguém escolheu.
   */
  const antigo = () => (temHub ? callHubOrFallback(body) : callDireto(body));

  try {
    let data: unknown;
    if (OPENROUTER_KEY) {
      try {
        data = await callOpenRouter(body);
      } catch (e) {
        if (e instanceof IAUsageError) throw e;
        console.warn(
          "ia-gateway: OpenRouter falhou, usando o caminho de reserva:",
          e instanceof Error ? e.message : String(e),
        );
        data = await antigo();
      }
    } else {
      data = await antigo();
    }
    const usage = extrairUsage(data);
    await logUso({
      acao: ctx.acao,
      modelo,
      tokensIn: usage.in ?? null,
      tokensOut: usage.out ?? null,
      status: "ok",
      userId: ctx.userId ?? null,
    });
    return data;
  } catch (e) {
    const status: "erro" | "limite" = e instanceof IAUsageError ? "limite" : "erro";
    await logUso({
      acao: ctx.acao,
      modelo,
      status,
      userId: ctx.userId ?? null,
    });
    throw e;
  }
}

async function callHubOrFallback(body: unknown): Promise<unknown> {
  try {
    return await callHub(body);
  } catch (e) {
    if (e instanceof IAUsageError) throw e;
    console.error("ia-gateway: HUB falhou, caindo para o direto:", e instanceof Error ? e.message : String(e));
    return await callDireto(body);
  }
}
