/**
 * FEATURE 027 — Enterprise Integration Hub.
 * Módulo aditivo, read-only. Reutiliza:
 *  - `@/modules/observability` (aggregators, dependency graph)
 *  - `@/modules/platform-health` (runtime health, performance)
 *  - `@/platform-sdk/services` (mesh, diagnostics)
 *  - `@/platform-sdk/runtime` (plugin host)
 *  - `@/platform-sdk/ai-sdk`, `workflow-sdk`, `event-sdk`, `orchestrator`
 */

export { INTEGRATION_ROUTES, type IntegrationRoute } from "./routes";
export { getIntegrationOverview, type IntegrationOverview } from "./overview";
export { getEdgeFunctionCatalog, type EdgeFunctionEntry } from "./edgeFunctions";
export { getInternalApiCatalog, type ApiCatalogEntry } from "./apiCatalog";
export { getWebhookTelemetry, type WebhookTelemetry } from "./webhookTelemetry";
export { getConnectorCatalog, type ConnectorEntry } from "./connectorCatalog";
export { getIntegrationDiagnostics, type IntegrationDiagnostics } from "./diagnostics";
export { getDeveloperDocs, type IntegrationDoc } from "./developerDocs";
