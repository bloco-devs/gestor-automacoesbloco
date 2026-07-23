/**
 * Rotas do Integration Hub — fonte-de-verdade única.
 */
export interface IntegrationRoute {
  to: string;
  label: string;
  description: string;
  wave: number;
}

export const INTEGRATION_ROUTES: IntegrationRoute[] = [
  { to: "/admin/integrations", label: "Visão Geral", description: "Estado consolidado das integrações.", wave: 1 },
  { to: "/admin/integrations/apis", label: "API Explorer", description: "Edge Functions e APIs internas.", wave: 2 },
  { to: "/admin/integrations/webhooks", label: "Webhook Center", description: "Entradas, saídas, retries e health.", wave: 3 },
  { to: "/admin/integrations/connectors", label: "Connector Hub", description: "Catálogo de conectores externos.", wave: 4 },
  { to: "/admin/integrations/mesh", label: "Service Mesh Gateway", description: "Contratos, providers, consumers.", wave: 5 },
  { to: "/admin/integrations/sdk", label: "SDK Explorer", description: "Plugins, comandos, extensões e skills.", wave: 6 },
  { to: "/admin/integrations/catalog", label: "API Catalog", description: "Superfícies agrupadas por domínio.", wave: 7 },
  { to: "/admin/integrations/diagnostics", label: "Diagnostics", description: "Timeouts, retries, health score.", wave: 8 },
  { to: "/admin/integrations/docs", label: "Developer Portal", description: "Docs, endpoints, SDK, contratos.", wave: 9 },
];
