// Helper central de IA: tenta o conector `lovable-ai` do HUB Bloco ID;
// se não houver secrets do HUB ou se ocorrer erro de infraestrutura, cai
// para o caminho direto (ai.gateway.lovable.dev). Erros de uso da IA
// (429 limite, 402 créditos) são propagados — NÃO acionam fallback.
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

// Ponto de entrada único. Body = payload OpenAI chat verbatim; retorna o JSON tal qual.
export async function callAI(body: unknown): Promise<unknown> {
  const temHub = Boolean(HUB_URL && HUB_TOKEN);
  if (!temHub) {
    // Sem secrets do HUB → caminho direto (comportamento atual).
    return await callDireto(body);
  }
  try {
    return await callHub(body);
  } catch (e) {
    // Erros de USO da IA propagam (não tenta o direto).
    if (e instanceof IAUsageError) throw e;
    // Qualquer outra falha (infra do gateway, rede, etc.) → fallback ao direto.
    console.error("ia-gateway: HUB falhou, caindo para o direto:", e instanceof Error ? e.message : String(e));
    return await callDireto(body);
  }
}
