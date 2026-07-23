/**
 * Catálogo estático de conectores — enterprise-oriented. Read-only.
 * Status derivado de flags/env quando presentes, senão "catalog".
 */
export type ConnectorKind = "database" | "ai" | "chat" | "email" | "protocol";
export type ConnectorStatus = "active" | "catalog" | "planned";

export interface ConnectorEntry {
  id: string;
  name: string;
  kind: ConnectorKind;
  status: ConnectorStatus;
  description: string;
}

const CATALOG: ConnectorEntry[] = [
  { id: "supabase", name: "Supabase", kind: "database", status: "active", description: "Banco e edge functions oficiais." },
  { id: "openai", name: "OpenAI", kind: "ai", status: "catalog", description: "LLMs GPT via IA Gateway." },
  { id: "gemini", name: "Google Gemini", kind: "ai", status: "catalog", description: "Gemini via IA Gateway." },
  { id: "slack", name: "Slack", kind: "chat", status: "catalog", description: "Notificações e canais." },
  { id: "teams", name: "Microsoft Teams", kind: "chat", status: "catalog", description: "Notificações corporativas." },
  { id: "discord", name: "Discord", kind: "chat", status: "planned", description: "Notificações opcionais." },
  { id: "email", name: "Email (SMTP)", kind: "email", status: "catalog", description: "Notificações transacionais." },
  { id: "webhook", name: "Webhook genérico", kind: "protocol", status: "active", description: "Entrega HTTP com retries." },
  { id: "rest", name: "REST", kind: "protocol", status: "active", description: "Protocolo padrão para integrações." },
  { id: "graphql", name: "GraphQL", kind: "protocol", status: "planned", description: "Cliente GraphQL federado." },
];

export function getConnectorCatalog(): ConnectorEntry[] {
  return CATALOG.slice().sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
}
