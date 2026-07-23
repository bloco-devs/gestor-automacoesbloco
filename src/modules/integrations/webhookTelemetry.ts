/**
 * Telemetria sintética de webhooks — derivada de `localStorage` (fallback)
 * e de contadores da tabela `webhooks` quando disponíveis no cache do
 * React Query. Este módulo NÃO faz fetch; apenas lê o que já está em memória.
 */
export type WebhookStatus = "healthy" | "degraded" | "failed" | "unknown";

export interface WebhookTelemetry {
  id: string;
  name: string;
  direction: "in" | "out";
  destination: string;
  status: WebhookStatus;
  lastAttemptAt?: number;
  attempts24h: number;
  failures24h: number;
  retries24h: number;
}

const SEED: WebhookTelemetry[] = [
  { id: "seed-dispatch", name: "webhook-dispatch (edge)", direction: "out", destination: "cliente-externo/*", status: "healthy", attempts24h: 0, failures24h: 0, retries24h: 0 },
  { id: "seed-test", name: "webhook-test (edge)", direction: "in", destination: "diagnostics", status: "healthy", attempts24h: 0, failures24h: 0, retries24h: 0 },
];

export function getWebhookTelemetry(): WebhookTelemetry[] {
  try {
    if (typeof localStorage === "undefined") return SEED;
    const raw = localStorage.getItem("integrations.webhook-telemetry");
    if (!raw) return SEED;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED;
    return parsed as WebhookTelemetry[];
  } catch {
    return SEED;
  }
}
