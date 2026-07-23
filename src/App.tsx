import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";

function RedirectLegacySolicitacao() {
  const { id } = useParams();
  return <Navigate to={`/solicitacao/${id ?? ""}`} replace />;
}
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RecoveryGuard } from "@/components/RecoveryGuard";
import AuthErrorScreen from "@/components/AuthErrorScreen";
import AppLayout from "@/components/AppLayout";
import { ContextProvider } from "@/modules/context";
import { PlatformProvider } from "@/modules/platform";
import { LanguageProvider } from "@/modules/ux";
import { WorkflowRuntimeProvider } from "@/modules/workflow-runtime";
import { Loader2 } from "lucide-react";

// Rotas críticas — carregamento imediato (auth/entrada)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SsoCallback from "./pages/SsoCallback";
import RedefinirSenha from "./pages/RedefinirSenha";
import EscolherPerfil from "./pages/EscolherPerfil";
import NotFound from "./pages/NotFound";

// Lazy — reduz o bundle inicial. Chunks nomeados por área.
const SolicitarSolucao = lazy(() => import("./pages/SolicitarSolucao"));
const NovaSolicitacao = lazy(() => import("./pages/NovaSolicitacao"));
const AIWorkspace = lazy(() => import(/* webpackChunkName: "ai" */ "./pages/AIWorkspace"));
const MinhasSolicitacoes = lazy(() => import("./pages/MinhasSolicitacoes"));
const RequesterDashboard = lazy(() => import("./pages/RequesterDashboard"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Kanban = lazy(() => import("./pages/Kanban"));
const Solucoes = lazy(() => import("./pages/Solucoes"));
const Solicitacoes = lazy(() => import("./pages/Solicitacoes"));
const SolucoesKanban = lazy(() => import("./pages/SolucoesKanban"));
const SolicitacoesGantt = lazy(() => import("./pages/SolicitacoesGantt"));
const SolucoesGantt = lazy(() => import("./pages/SolucoesGantt"));
const SolicitacaoDetail = lazy(() => import("./pages/SolicitacaoDetail"));
const SolucaoDetail = lazy(() => import("./pages/SolucaoDetail"));
const Configuracoes = lazy(() => import("./pages/Configuracoes"));
const Diagrama = lazy(() => import("./pages/Diagrama"));
const Atividades = lazy(() => import(/* webpackChunkName: "atividades" */ "./pages/Atividades"));
const AtividadesBoard = lazy(() => import(/* webpackChunkName: "atividades" */ "./pages/AtividadesBoard"));
const ImportarQuadro = lazy(() => import(/* webpackChunkName: "atividades" */ "./pages/atividades/importar/ImportarQuadro"));
const Ajuda = lazy(() => import("./pages/Ajuda"));
const MeuPerfil = lazy(() => import("./pages/MeuPerfil"));
const ObservabilidadeIA = lazy(() => import(/* webpackChunkName: "ai" */ "./pages/ObservabilidadeIA"));
const Consolidacao = lazy(() => import("./pages/Consolidacao"));
const Inbox = lazy(() => import(/* webpackChunkName: "workspace" */ "./pages/Inbox"));
const Operacoes = lazy(() => import(/* webpackChunkName: "operations" */ "./pages/Operacoes"));
const DeveloperWorkspace = lazy(() => import(/* webpackChunkName: "workspace" */ "./pages/DeveloperWorkspace"));
const CommandCenter = lazy(() => import(/* webpackChunkName: "operations" */ "./pages/CommandCenter"));
const Portal = lazy(() => import("./pages/Portal"));
const PortalIndex = lazy(() => import("./pages/portal/PortalIndex"));
const BaseConhecimentoAdmin = lazy(() => import(/* webpackChunkName: "knowledge" */ "./pages/admin/BaseConhecimento"));
const Demandas = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Demandas"));
const AdminDashboard = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Dashboard"));
const SLAPolicies = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/SLAPolicies"));
const WebhooksAdmin = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Webhooks"));
const WorkflowsPage = lazy(() => import(/* webpackChunkName: "workflows" */ "./pages/admin/Workflows"));
const WorkflowEditorPage = lazy(() => import(/* webpackChunkName: "workflows" */ "./pages/admin/WorkflowEditor"));
const WorkflowExecutionsPage = lazy(() => import(/* webpackChunkName: "workflows" */ "./pages/admin/WorkflowExecutions"));
const AdminHubLegado = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/AdminHub"));
const AdminShellPage = lazy(() => import(/* webpackChunkName: "admin" */ "./modules/admin-shell/AdminShellPage"));
const GovernancePage = lazy(() => import(/* webpackChunkName: "admin" */ "./modules/governance/GovernancePage"));
const SdkSandbox = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/SdkSandbox"));
const MarketplacePage = lazy(() => import(/* webpackChunkName: "admin" */ "./plugins/marketplace/pages/MarketplacePage"));
const SaudePage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Saude"));
const AnalyticsPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/Analytics"));
const EcossistemaPage = lazy(() => import("./pages/Ecossistema"));

// FEATURE 023 — Production Hardening
const PlatformHealthPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/PlatformHealth"));
const ErrorCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/ErrorCenter"));
const FeatureFlagsPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/FeatureFlags"));
const SettingsCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/SettingsCenter"));
const SecretsCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/SecretsCenter"));
const SessionsCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/SessionsCenter"));
const AuditCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/AuditCenter"));
const BackupCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/BackupCenter"));
const PerformanceCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/PerformanceCenter"));
const ReleaseCenterPage = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/admin/ReleaseCenter"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const msg = error instanceof Error ? error.message : String(error ?? "");
        if (/permission|denied|rls|401|403|404/i.test(msg)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

function RouteFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-[40dvh] text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      Carregando…
    </div>
  );
}

const AppRoutes = () => {
  const { authError, loading } = useAuth();
  if (authError && !loading) return <AuthErrorScreen />;
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/sso/callback" element={<SsoCallback />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/escolher-perfil" element={<ProtectedRoute><EscolherPerfil /></ProtectedRoute>} />
        <Route path="/solicitar" element={<SolicitarSolucao />} />
        <Route path="/" element={<Index />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          {/* Solicitante */}
          <Route path="/portal" element={<ProtectedRoute><Portal /></ProtectedRoute>} />
          <Route path="/portal/central" element={<ProtectedRoute><PortalIndex /></ProtectedRoute>} />
          <Route path="/dashboard-solicitante" element={<ProtectedRoute role="requester"><RequesterDashboard /></ProtectedRoute>} />
          <Route path="/minhas-solicitacoes" element={<ProtectedRoute role="requester"><MinhasSolicitacoes /></ProtectedRoute>} />
          <Route path="/nova-solicitacao" element={<ProtectedRoute role="requester"><AIWorkspace /></ProtectedRoute>} />
          <Route path="/nova-solicitacao/classico" element={<ProtectedRoute role="requester"><NovaSolicitacao /></ProtectedRoute>} />

          {/* Desenvolvedor */}
          <Route path="/dashboard" element={<ProtectedRoute role="developer"><Dashboard /></ProtectedRoute>} />
          <Route path="/solicitacoes" element={<ProtectedRoute><Solicitacoes /></ProtectedRoute>} />
          <Route path="/solicitacoes/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
          <Route path="/solicitacoes/gantt" element={<ProtectedRoute><SolicitacoesGantt /></ProtectedRoute>} />
          <Route path="/kanban" element={<Navigate to="/solicitacoes/kanban" replace />} />
          <Route path="/solucoes" element={<ProtectedRoute role="developer"><Solucoes /></ProtectedRoute>} />
          <Route path="/solucoes/kanban" element={<ProtectedRoute role="developer"><SolucoesKanban /></ProtectedRoute>} />
          <Route path="/solucoes/gantt" element={<ProtectedRoute role="developer"><SolucoesGantt /></ProtectedRoute>} />
          <Route path="/solucoes/:id" element={<ProtectedRoute role="developer"><SolucaoDetail /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute role="developer"><Configuracoes /></ProtectedRoute>} />
          <Route path="/diagrama" element={<ProtectedRoute role="developer"><Diagrama /></ProtectedRoute>} />
          <Route path="/atividades" element={<ProtectedRoute role="developer"><Atividades /></ProtectedRoute>} />
          <Route path="/atividades/importar" element={<ProtectedRoute role="developer"><ImportarQuadro /></ProtectedRoute>} />
          <Route path="/atividades/:boardId" element={<ProtectedRoute role="developer"><AtividadesBoard /></ProtectedRoute>} />


          <Route path="/observabilidade-ia" element={<ProtectedRoute role="developer"><ObservabilidadeIA /></ProtectedRoute>} />
          <Route path="/consolidacao" element={<ProtectedRoute role="developer"><Consolidacao /></ProtectedRoute>} />
          <Route path="/admin/base-conhecimento" element={<ProtectedRoute role="developer"><BaseConhecimentoAdmin /></ProtectedRoute>} />
          <Route path="/admin/demandas" element={<ProtectedRoute role="developer"><Demandas /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute role="developer"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/configuracoes/sla" element={<ProtectedRoute role="developer"><SLAPolicies /></ProtectedRoute>} />
          <Route path="/admin/configuracoes/webhooks" element={<ProtectedRoute role="developer"><WebhooksAdmin /></ProtectedRoute>} />
          <Route path="/admin/workflows" element={<ProtectedRoute role="developer"><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/admin/workflows/novo" element={<ProtectedRoute role="developer"><WorkflowEditorPage /></ProtectedRoute>} />
          <Route path="/admin/workflows/execucoes" element={<ProtectedRoute role="developer"><WorkflowExecutionsPage /></ProtectedRoute>} />
          <Route path="/admin/workflows/:id" element={<ProtectedRoute role="developer"><WorkflowEditorPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute role="developer"><AdminShellPage /></ProtectedRoute>} />
          <Route path="/admin/quality" element={<ProtectedRoute role="developer"><GovernancePage /></ProtectedRoute>} />
          <Route path="/admin/sdk" element={<ProtectedRoute role="developer"><SdkSandbox /></ProtectedRoute>} />
          <Route path="/admin/marketplace" element={<ProtectedRoute role="developer"><MarketplacePage /></ProtectedRoute>} />
          <Route path="/admin/legado" element={<ProtectedRoute role="developer"><AdminHubLegado /></ProtectedRoute>} />
          <Route path="/admin/saude" element={<ProtectedRoute role="developer"><SaudePage /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute role="developer"><AnalyticsPage /></ProtectedRoute>} />
          {/* FEATURE 023 — Production Hardening */}
          <Route path="/admin/platform" element={<ProtectedRoute role="developer"><PlatformHealthPage /></ProtectedRoute>} />
          <Route path="/admin/errors" element={<ProtectedRoute role="developer"><ErrorCenterPage /></ProtectedRoute>} />
          <Route path="/admin/feature-flags" element={<ProtectedRoute role="developer"><FeatureFlagsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute role="developer"><SettingsCenterPage /></ProtectedRoute>} />
          <Route path="/admin/secrets" element={<ProtectedRoute role="developer"><SecretsCenterPage /></ProtectedRoute>} />
          <Route path="/admin/sessions" element={<ProtectedRoute role="developer"><SessionsCenterPage /></ProtectedRoute>} />
          <Route path="/admin/audit" element={<ProtectedRoute role="developer"><AuditCenterPage /></ProtectedRoute>} />
          <Route path="/admin/backup" element={<ProtectedRoute role="developer"><BackupCenterPage /></ProtectedRoute>} />
          <Route path="/admin/performance" element={<ProtectedRoute role="developer"><PerformanceCenterPage /></ProtectedRoute>} />
          <Route path="/admin/release" element={<ProtectedRoute role="developer"><ReleaseCenterPage /></ProtectedRoute>} />
          <Route path="/ecossistema" element={<ProtectedRoute><EcossistemaPage /></ProtectedRoute>} />

          {/* Trabalho — Inbox (Centro de Trabalho Inteligente) */}
          <Route path="/trabalho/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
          <Route path="/operacoes" element={<ProtectedRoute role="developer"><Operacoes /></ProtectedRoute>} />
          <Route path="/workspace" element={<ProtectedRoute role="developer"><DeveloperWorkspace /></ProtectedRoute>} />
          <Route path="/command-center" element={<ProtectedRoute role="developer"><CommandCenter /></ProtectedRoute>} />

          {/* Compartilhado */}
          <Route path="/ajuda" element={<Ajuda />} />
          <Route path="/perfil" element={<MeuPerfil />} />
          <Route path="/solicitacao/:id" element={<SolicitacaoDetail />} />
        </Route>

        {/* Redirecionamentos de rotas antigas (compatibilidade) */}
        <Route path="/minhas-demandas" element={<Navigate to="/minhas-solicitacoes" replace />} />
        <Route path="/nova-demanda" element={<Navigate to="/nova-solicitacao" replace />} />
        <Route path="/demanda/:id" element={<RedirectLegacySolicitacao />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ContextProvider>
            <LanguageProvider>
              <PlatformProvider>
                <WorkflowRuntimeProvider>
                  <RecoveryGuard />
                  <AppRoutes />
                </WorkflowRuntimeProvider>
              </PlatformProvider>
            </LanguageProvider>
          </ContextProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
