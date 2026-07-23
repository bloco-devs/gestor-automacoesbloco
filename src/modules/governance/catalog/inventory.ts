import type { CatalogNode, InventoryStat, LargeFile } from "../types";

/**
 * Inventário estático da plataforma.
 * Números refletem o estado do repositório na entrega da FEATURE 021.
 * Fonte de leitura apenas — não faz varredura em runtime.
 */
export const INVENTORY: InventoryStat[] = [
  { key: "pages", label: "Páginas", count: 50 },
  { key: "routes", label: "Rotas", count: 54 },
  { key: "modules", label: "Módulos", count: 19 },
  { key: "components", label: "Componentes", count: 122 },
  { key: "hooks", label: "Hooks globais", count: 13 },
  { key: "services", label: "Services/libs", count: 12 },
  { key: "engines", label: "Engines", count: 6, description: "workflow-engine, workflow-runtime, routing, context, platform, ux" },
  { key: "providers", label: "Providers", count: 6, description: "Auth, QueryClient, Context, Platform, Language, WorkflowRuntime" },
  { key: "edges", label: "Edge Functions", count: 20 },
  { key: "ds", label: "Design System 2.0 (arquivos)", count: 14 },
  { key: "docs", label: "Documentos oficiais", count: 45 },
  { key: "tests", label: "Arquivos de teste", count: 33 },
  { key: "features", label: "Features entregues", count: 21 },
];

export const MODULES: CatalogNode[] = [
  { id: "ai", label: "AI Workspace", type: "module", path: "src/modules/ai", dependencies: ["context", "platform"], reuse: 4 },
  { id: "analytics", label: "Analytics", type: "module", path: "src/modules/analytics", dependencies: ["operations", "routing", "knowledge", "workflow-runtime"], reuse: 3 },
  { id: "context", label: "Context Engine", type: "module", path: "src/modules/context", dependencies: [], reuse: 9 },
  { id: "copilot", label: "Copilot (placeholder)", type: "module", path: "src/modules/copilot", dependencies: ["context"], reuse: 1 },
  { id: "dashboard", label: "Dashboard", type: "module", path: "src/modules/dashboard", dependencies: ["operations"], reuse: 2 },
  { id: "demands", label: "Demands (Board)", type: "module", path: "src/modules/demands", dependencies: ["routing", "workflow-runtime", "knowledge"], reuse: 3 },
  { id: "ecossistema", label: "Ecossistema", type: "module", path: "src/modules/ecossistema", dependencies: ["context"], reuse: 4 },
  { id: "inbox", label: "Intelligent Inbox", type: "module", path: "src/modules/inbox", dependencies: ["context", "platform"], reuse: 2 },
  { id: "knowledge", label: "Knowledge", type: "module", path: "src/modules/knowledge", dependencies: [], reuse: 5 },
  { id: "knowledge-admin", label: "Knowledge Admin", type: "module", path: "src/modules/knowledge-admin", dependencies: ["knowledge"], reuse: 1 },
  { id: "notifications", label: "Notifications", type: "module", path: "src/modules/notifications", dependencies: [], reuse: 2 },
  { id: "operations", label: "Operations", type: "module", path: "src/modules/operations", dependencies: ["routing", "demands", "ecossistema"], reuse: 4 },
  { id: "platform", label: "Platform Layer", type: "module", path: "src/modules/platform", dependencies: [], reuse: 8 },
  { id: "routing", label: "Smart Routing", type: "module", path: "src/modules/routing", dependencies: ["ecossistema"], reuse: 5 },
  { id: "ux", label: "Human First UX", type: "module", path: "src/modules/ux", dependencies: [], reuse: 6 },
  { id: "workflow-builder", label: "Workflow Builder", type: "module", path: "src/modules/workflow-builder", dependencies: ["workflow-engine"], reuse: 1 },
  { id: "workflow-engine", label: "Workflow Engine", type: "module", path: "src/modules/workflow-engine", dependencies: [], reuse: 3 },
  { id: "workflow-runtime", label: "Workflow Runtime", type: "module", path: "src/modules/workflow-runtime", dependencies: ["workflow-engine"], reuse: 3 },
  { id: "admin-shell", label: "Admin Shell", type: "module", path: "src/modules/admin-shell", dependencies: ["platform"], reuse: 1 },
];

export const HOOKS: CatalogNode[] = [
  { id: "useAuth", label: "useAuth", type: "hook", path: "src/hooks/useAuth.tsx", reuse: 12 },
  { id: "useTheme", label: "useTheme", type: "hook", path: "src/hooks/useTheme.tsx", reuse: 3 },
  { id: "useFeatureFlags", label: "useFeatureFlags", type: "hook", path: "src/hooks/useFeatureFlags.ts", reuse: 4 },
  { id: "useSupabaseData", label: "useSupabaseData", type: "hook", path: "src/hooks/useSupabaseData.ts", reuse: 6 },
  { id: "useSupabaseQuery", label: "useSupabaseQuery", type: "hook", path: "src/hooks/useSupabaseQuery.ts", reuse: 4 },
  { id: "useNotificacoes", label: "useNotificacoes", type: "hook", path: "src/hooks/useNotificacoes.ts", reuse: 3 },
  { id: "useSetores", label: "useSetores", type: "hook", path: "src/hooks/useSetores.ts", reuse: 2 },
  { id: "useEcossistemaSistemas", label: "useEcossistemaSistemas", type: "hook", path: "src/hooks/useEcossistemaSistemas.ts", reuse: 2 },
  { id: "useAtividadesBoard", label: "useAtividadesBoard", type: "hook", path: "src/hooks/useAtividadesBoard.ts", reuse: 2 },
  { id: "useCardMutations", label: "useCardMutations", type: "hook", path: "src/hooks/useCardMutations.ts", reuse: 1 },
  { id: "useAIWorkspace", label: "useAIWorkspace", type: "hook", path: "src/hooks/useAIWorkspace.ts", reuse: 1 },
  { id: "use-mobile", label: "useIsMobile", type: "hook", path: "src/hooks/use-mobile.tsx", reuse: 5 },
  { id: "use-toast", label: "useToast", type: "hook", path: "src/hooks/use-toast.ts", reuse: 20 },
];

export const SERVICES: CatalogNode[] = [
  { id: "supabaseData", label: "supabaseData", type: "service", path: "src/lib/supabaseData.ts", reuse: 12 },
  { id: "atividades", label: "atividades", type: "service", path: "src/lib/atividades.ts", reuse: 6 },
  { id: "atividadesBoards", label: "atividadesBoards", type: "service", path: "src/lib/atividadesBoards.ts", reuse: 4 },
  { id: "score", label: "score", type: "service", path: "src/lib/score.ts", reuse: 3 },
  { id: "utils", label: "utils (cn)", type: "service", path: "src/lib/utils.ts", reuse: 80 },
];

export const ENGINES: CatalogNode[] = [
  { id: "workflow-engine", label: "Workflow Engine", type: "engine", path: "src/modules/workflow-engine" },
  { id: "workflow-runtime", label: "Workflow Runtime", type: "engine", path: "src/modules/workflow-runtime" },
  { id: "routing", label: "Routing Engine", type: "engine", path: "src/modules/routing/engine" },
  { id: "context", label: "Context Engine", type: "engine", path: "src/modules/context" },
  { id: "platform", label: "Platform Layer", type: "engine", path: "src/modules/platform" },
  { id: "ai-orchestrator", label: "AI Intent Orchestrator", type: "engine", path: "src/modules/ai" },
];

export const EDGE_FUNCTIONS: CatalogNode[] = [
  "assistente-demanda", "bloco-connect", "bulk-create-requesters", "confirmar-atendimento-existente",
  "demand-ai-plan", "demand-auto-responder", "demand-triage", "demandas-similares",
  "ecossistema-mapa", "importer-run", "importer-upload", "mapa-narrativa",
  "match-ecossistema", "provision-user", "reprocessar-matches", "resumo-pipeline",
  "sso-login", "triagem-demanda", "webhook-dispatch", "webhook-test",
].map((name) => ({ id: name, label: name, type: "edge" as const, path: `supabase/functions/${name}` }));

export const PROVIDERS: CatalogNode[] = [
  { id: "AuthProvider", label: "AuthProvider", type: "provider", path: "src/hooks/useAuth.tsx" },
  { id: "QueryClientProvider", label: "QueryClientProvider", type: "provider", path: "src/App.tsx" },
  { id: "ContextProvider", label: "ContextProvider", type: "provider", path: "src/modules/context" },
  { id: "PlatformProvider", label: "PlatformProvider", type: "provider", path: "src/modules/platform" },
  { id: "LanguageProvider", label: "LanguageProvider", type: "provider", path: "src/modules/ux" },
  { id: "WorkflowRuntimeProvider", label: "WorkflowRuntimeProvider", type: "provider", path: "src/modules/workflow-runtime" },
];

export const DESIGN_SYSTEM: CatalogNode[] = [
  { id: "PageShell", label: "PageShell", type: "design-system", path: "src/design-system/layout/PageShell.tsx", reuse: 40 },
  { id: "PageHeader", label: "PageHeader", type: "design-system", path: "src/design-system/layout/PageHeader.tsx", reuse: 25 },
  { id: "Section", label: "Section", type: "design-system", path: "src/design-system/layout/Section.tsx", reuse: 60 },
  { id: "Toolbar", label: "Toolbar", type: "design-system", path: "src/design-system/layout/Toolbar.tsx", reuse: 6 },
  { id: "StatCard", label: "StatCard", type: "design-system", path: "src/design-system/patterns/StatCard.tsx", reuse: 30 },
  { id: "KpiRow", label: "KpiRow", type: "design-system", path: "src/design-system/patterns/KpiRow.tsx", reuse: 12 },
  { id: "EmptyPanel", label: "EmptyPanel", type: "design-system", path: "src/design-system/patterns/EmptyPanel.tsx", reuse: 8 },
];

/** Maiores arquivos-fonte (bytes). Snapshot da entrega da FEATURE 021. */
export const LARGE_FILES: LargeFile[] = [
  { path: "src/integrations/supabase/types.ts", bytes: 79077, category: "generated" },
  { path: "src/components/atividades/quadros/BoardSettingsDialog.tsx", bytes: 61173, category: "component" },
  { path: "src/pages/SolicitacaoDetail.tsx", bytes: 52518, category: "page" },
  { path: "src/pages/Diagrama.tsx", bytes: 50562, category: "page" },
  { path: "src/pages/AtividadesBoard.tsx", bytes: 35200, category: "page" },
  { path: "src/components/atividades/CardDialog.tsx", bytes: 28889, category: "component" },
  { path: "src/pages/Portal.tsx", bytes: 28530, category: "page" },
  { path: "src/pages/Configuracoes.tsx", bytes: 25190, category: "page" },
  { path: "src/lib/supabaseData.ts", bytes: 24878, category: "lib" },
  { path: "src/modules/demands/components/DemandDetailDialog.tsx", bytes: 24274, category: "module" },
  { path: "src/components/ui/sidebar.tsx", bytes: 22837, category: "component" },
  { path: "src/lib/atividades.ts", bytes: 22473, category: "lib" },
  { path: "src/pages/NovaSolicitacao.tsx", bytes: 17848, category: "page" },
  { path: "src/pages/Consolidacao.tsx", bytes: 17005, category: "page" },
  { path: "src/pages/Solucoes.tsx", bytes: 15361, category: "page" },
  { path: "src/components/AppLayout.tsx", bytes: 13648, category: "component" },
  { path: "src/modules/demands/components/CreateDemandDialog.tsx", bytes: 13586, category: "module" },
  { path: "src/lib/atividadesBoards.ts", bytes: 13390, category: "lib" },
  { path: "src/modules/analytics/utils/systemAffinityAnalytics.ts", bytes: 13151, category: "module" },
  { path: "src/pages/atividades/importar/ImportarQuadro.tsx", bytes: 12956, category: "page" },
];
