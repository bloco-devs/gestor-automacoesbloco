/**
 * Catálogo estático das edge functions existentes.
 * Fonte: `supabase/functions/` — mantido manualmente porque não há
 * introspecção runtime disponível no cliente.
 */
export type EdgeFunctionCategory =
  | "auth"
  | "ia"
  | "demandas"
  | "ecossistema"
  | "importador"
  | "webhooks"
  | "admin";

export interface EdgeFunctionEntry {
  name: string;
  method: "POST" | "GET";
  category: EdgeFunctionCategory;
  verifyJwt: boolean;
  description: string;
  version: string;
}

const CATALOG: EdgeFunctionEntry[] = [
  { name: "sso-login", method: "POST", category: "auth", verifyJwt: false, description: "Login federado Bloco ID (SSO).", version: "1.0" },
  { name: "bloco-connect", method: "POST", category: "auth", verifyJwt: false, description: "Handshake com HUB Bloco ID.", version: "1.0" },
  { name: "provision-user", method: "POST", category: "auth", verifyJwt: true, description: "Provisionamento inicial de usuário.", version: "1.0" },
  { name: "bulk-create-requesters", method: "POST", category: "admin", verifyJwt: true, description: "Criação em lote de solicitantes.", version: "1.0" },
  { name: "assistente-demanda", method: "POST", category: "ia", verifyJwt: true, description: "Assistente IA para preenchimento.", version: "1.1" },
  { name: "triagem-demanda", method: "POST", category: "ia", verifyJwt: true, description: "Triagem inteligente (score IA + servidor).", version: "1.1" },
  { name: "demand-triage", method: "POST", category: "demandas", verifyJwt: true, description: "Roteamento inicial de demanda.", version: "1.0" },
  { name: "demand-ai-plan", method: "POST", category: "ia", verifyJwt: true, description: "Plano de execução por IA.", version: "1.0" },
  { name: "demand-auto-responder", method: "POST", category: "ia", verifyJwt: true, description: "Auto-resposta baseada em contexto.", version: "1.0" },
  { name: "demandas-similares", method: "POST", category: "ia", verifyJwt: true, description: "Detecção de demandas duplicadas.", version: "1.0" },
  { name: "confirmar-atendimento-existente", method: "POST", category: "demandas", verifyJwt: true, description: "Vincula demanda a atendimento existente.", version: "1.0" },
  { name: "resumo-pipeline", method: "POST", category: "ia", verifyJwt: true, description: "Resumo executivo do pipeline.", version: "1.0" },
  { name: "reprocessar-matches", method: "POST", category: "demandas", verifyJwt: true, description: "Reprocessa matches de ecossistema.", version: "1.0" },
  { name: "match-ecossistema", method: "POST", category: "ecossistema", verifyJwt: true, description: "Match ao vivo com catálogo do HUB.", version: "1.0" },
  { name: "ecossistema-mapa", method: "GET", category: "ecossistema", verifyJwt: true, description: "Mapa vivo do ecossistema (HUB).", version: "1.1" },
  { name: "mapa-narrativa", method: "POST", category: "ecossistema", verifyJwt: true, description: "Narrativa IA sobre o mapa.", version: "1.0" },
  { name: "importer-upload", method: "POST", category: "importador", verifyJwt: true, description: "Upload de snapshot para importador.", version: "1.0" },
  { name: "importer-run", method: "POST", category: "importador", verifyJwt: true, description: "Execução do pipeline de importação.", version: "1.0" },
  { name: "webhook-dispatch", method: "POST", category: "webhooks", verifyJwt: true, description: "Disparador com retries.", version: "1.0" },
  { name: "webhook-test", method: "POST", category: "webhooks", verifyJwt: true, description: "Endpoint de teste para webhooks.", version: "1.0" },
];

export function getEdgeFunctionCatalog(): EdgeFunctionEntry[] {
  return CATALOG.slice().sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
