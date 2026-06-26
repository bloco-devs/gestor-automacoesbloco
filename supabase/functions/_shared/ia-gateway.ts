// Helper central de IA: tenta o conector `lovable-ai` do HUB Bloco ID;
// se não houver secrets do HUB ou se ocorrer erro de infraestrutura, cai
// para o caminho direto (ai.gateway.lovable.dev). Erros de uso da IA
// (429 limite, 402 créditos) são propagados — NÃO acionam fallback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HUB_URL = (Deno.env.get("BLOCO_ID_HUB_URL") ?? "").replace(/\/+$/, "");
const HUB_TOKEN = Deno.env.get("BLOCO_ID_TOKEN") ?? "";

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

  try {
    const data = temHub ? await callHubOrFallback(body) : await callDireto(body);
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
