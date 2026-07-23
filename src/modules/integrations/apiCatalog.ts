/**
 * API Catalog — agrupamento de superfícies internas por domínio.
 * Read-only: reflete o inventário atual de rotas e edge functions.
 */
export type ApiSurface = "edge-function" | "internal-route" | "service" | "plugin-command";

export interface ApiCatalogEntry {
  domain: string;
  surface: ApiSurface;
  name: string;
  description: string;
}

const ENTRIES: ApiCatalogEntry[] = [
  { domain: "Portal", surface: "internal-route", name: "/portal", description: "Portal do solicitante (v4)." },
  { domain: "Portal", surface: "edge-function", name: "match-ecossistema", description: "Match ao vivo de sistemas." },
  { domain: "Workspace", surface: "internal-route", name: "/workspace", description: "Developer Workspace." },
  { domain: "Workspace", surface: "service", name: "service.ai-sdk", description: "AI SDK publicado no mesh." },
  { domain: "Operations", surface: "internal-route", name: "/operacoes", description: "Centro de Operações." },
  { domain: "Operations", surface: "internal-route", name: "/command-center", description: "Command Center." },
  { domain: "Analytics", surface: "internal-route", name: "/admin/analytics", description: "Analytics Intelligence." },
  { domain: "Knowledge", surface: "internal-route", name: "/admin/base-conhecimento", description: "Base de conhecimento." },
  { domain: "Workflow", surface: "internal-route", name: "/admin/workflows", description: "Workflow Builder & Runtime." },
  { domain: "Workflow", surface: "service", name: "service.workflow-sdk", description: "Workflow SDK." },
  { domain: "Routing", surface: "service", name: "service.routing", description: "Smart Routing." },
  { domain: "Ecossistema", surface: "internal-route", name: "/ecossistema", description: "Mapa vivo do ecossistema." },
  { domain: "Ecossistema", surface: "edge-function", name: "ecossistema-mapa", description: "Ecossistema (HUB read-only)." },
  { domain: "Admin", surface: "internal-route", name: "/admin", description: "Admin Hub 2.0." },
  { domain: "Security", surface: "internal-route", name: "/admin/security", description: "Security Center." },
  { domain: "Observability", surface: "internal-route", name: "/admin/observability", description: "Observability Center." },
  { domain: "Studio", surface: "internal-route", name: "/studio", description: "Platform Studio." },
  { domain: "Developer", surface: "internal-route", name: "/developer", description: "Developer Experience Center." },
  { domain: "Developer", surface: "service", name: "service.event-sdk", description: "Event Automation SDK." },
  { domain: "Auth", surface: "edge-function", name: "sso-login", description: "SSO Bloco ID." },
  { domain: "IA", surface: "edge-function", name: "assistente-demanda", description: "Assistente conversacional." },
];

export function getInternalApiCatalog(): ApiCatalogEntry[] {
  return ENTRIES.slice().sort((a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name));
}
