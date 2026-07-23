/**
 * Índice de rotas do Developer Center.
 * Fonte-de-verdade única para navegação, breadcrumbs e Documentation Hub.
 */
export interface DeveloperRoute {
  to: string;
  label: string;
  description: string;
  wave: number;
}

export const DEVELOPER_ROUTES: DeveloperRoute[] = [
  { to: "/developer", label: "Visão Geral", description: "Ambiente, build, runtime e atalhos.", wave: 1 },
  { to: "/developer/runtime", label: "Runtime Inspector", description: "React, Query, Mesh, Plugins, Workflow, AI.", wave: 2 },
  { to: "/developer/components", label: "Component Inspector", description: "Árvore viva de componentes montados.", wave: 3 },
  { to: "/developer/query", label: "Query Inspector", description: "Cache do React Query em tempo real.", wave: 4 },
  { to: "/developer/services", label: "Service Mesh Explorer", description: "Providers, consumers e contratos.", wave: 5 },
  { to: "/developer/plugins", label: "Plugin Explorer", description: "Lifecycle, comandos e widgets dos plugins.", wave: 6 },
  { to: "/developer/ai", label: "AI Diagnostics", description: "Skills, agents, prompts, planos.", wave: 7 },
  { to: "/developer/workflows", label: "Workflow Diagnostics", description: "Triggers, actions, hooks e execuções.", wave: 8 },
  { to: "/developer/performance", label: "Performance Lab", description: "FPS, memória, saúde de runtimes.", wave: 9 },
  { to: "/developer/dependencies", label: "Dependency Explorer", description: "Grafo Mermaid de módulos e SDKs.", wave: 10 },
  { to: "/developer/quality", label: "Code Health", description: "Sinais de qualidade in-memory.", wave: 11 },
  { to: "/developer/docs", label: "Documentation Hub", description: "Índice pesquisável de docs/*.", wave: 13 },
];
