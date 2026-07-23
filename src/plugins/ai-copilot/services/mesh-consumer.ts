/**
 * AI Copilot — consumo do Service Mesh.
 * Este é o ÚNICO ponto onde o Copilot obtém capacidades de outros domínios.
 * NÃO importa `@/modules/knowledge`, `@/modules/routing` nem `@/modules/analytics`.
 *
 * PLUGIN 003 · Service Federation.
 */
import {
  serviceMesh,
  type KnowledgeService,
  type RoutingService,
  type AnalyticsService,
  SERVICE_CONTRACTS,
} from "@/platform-sdk";

const CONSUMER_ID = "plugin.ai-copilot";

export interface CopilotMeshHandles {
  knowledge: KnowledgeService | null;
  routing: RoutingService | null;
  analytics: AnalyticsService | null;
}

/** Resolve todos os serviços que o Copilot pode usar. Nenhum é obrigatório. */
export function resolveCopilotServices(): CopilotMeshHandles {
  return {
    knowledge: serviceMesh.optional(SERVICE_CONTRACTS.knowledge, { consumerId: CONSUMER_ID }),
    routing: serviceMesh.optional(SERVICE_CONTRACTS.routing, { consumerId: CONSUMER_ID }),
    analytics: serviceMesh.optional(SERVICE_CONTRACTS.analytics, { consumerId: CONSUMER_ID }),
  };
}

/** Helper alto-nível: sugestão de artigos relacionados via Mesh. */
export async function fetchRelatedKnowledge(query: string, limit = 3) {
  const svc = serviceMesh.optional(SERVICE_CONTRACTS.knowledge, { consumerId: CONSUMER_ID });
  if (!svc) return [];
  try {
    return await svc.search({ query, limit });
  } catch {
    return [];
  }
}

/** Snapshot para o Sandbox / Developer Tools. */
export function copilotMeshSnapshot() {
  return {
    consumerId: CONSUMER_ID,
    services: {
      knowledge: serviceMesh.describe(SERVICE_CONTRACTS.knowledge, { consumerId: CONSUMER_ID }),
      routing: serviceMesh.describe(SERVICE_CONTRACTS.routing, { consumerId: CONSUMER_ID }),
      analytics: serviceMesh.describe(SERVICE_CONTRACTS.analytics, { consumerId: CONSUMER_ID }),
    },
  };
}
