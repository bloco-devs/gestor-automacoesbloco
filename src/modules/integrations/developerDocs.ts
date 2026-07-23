/**
 * Índice pesquisável do Developer Portal.
 * Fonte-de-verdade: pasta `docs/`. Curadoria manual, aditiva.
 */
export interface IntegrationDoc {
  path: string;
  title: string;
  group: "Arquitetura" | "SDK" | "Segurança" | "IA" | "Operação" | "Integração";
  summary: string;
}

const DOCS: IntegrationDoc[] = [
  { path: "docs/05-Arquitetura.md", title: "Arquitetura", group: "Arquitetura", summary: "Blueprint da plataforma." },
  { path: "docs/10-Backend.md", title: "Backend", group: "Arquitetura", summary: "Supabase e edge functions." },
  { path: "docs/14-Integracoes.md", title: "Integrações (v1)", group: "Integração", summary: "Contratos históricos." },
  { path: "docs/51-Platform-SDK.md", title: "Platform SDK", group: "SDK", summary: "Runtime de plugins." },
  { path: "docs/55-Service-Mesh.md", title: "Service Mesh", group: "SDK", summary: "Federation entre plugins." },
  { path: "docs/56-Extension-Host.md", title: "Extension Host", group: "SDK", summary: "Plugins remotos." },
  { path: "docs/57-Workflow-SDK.md", title: "Workflow SDK", group: "SDK", summary: "Gatilhos, ações, hooks." },
  { path: "docs/58-Event-Automation-SDK.md", title: "Event Automation SDK", group: "SDK", summary: "Event Bus oficial." },
  { path: "docs/59-AI-SDK.md", title: "AI SDK", group: "IA", summary: "Skills, prompts, agentes." },
  { path: "docs/60-AI-Orchestrator.md", title: "AI Orchestrator", group: "IA", summary: "Multi-agent runtime." },
  { path: "docs/62-Platform-Health.md", title: "Platform Health", group: "Operação", summary: "Monitor de saúde." },
  { path: "docs/73-Security-Center.md", title: "Security Center", group: "Segurança", summary: "Controles e políticas." },
  { path: "docs/82-Integration-Audit.md", title: "Integration Audit", group: "Integração", summary: "Auditoria FEATURE 027." },
  { path: "docs/83-Integration-Platform.md", title: "Integration Platform", group: "Integração", summary: "Especificação do hub." },
];

export function getDeveloperDocs(): IntegrationDoc[] {
  return DOCS.slice().sort((a, b) => a.group.localeCompare(b.group) || a.title.localeCompare(b.title));
}
