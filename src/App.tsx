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
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SsoCallback from "./pages/SsoCallback";
import RedefinirSenha from "./pages/RedefinirSenha";
import EscolherPerfil from "./pages/EscolherPerfil";
import SolicitarSolucao from "./pages/SolicitarSolucao";
import NovaSolicitacao from "./pages/NovaSolicitacao";
import AIWorkspace from "./pages/AIWorkspace";
import MinhasSolicitacoes from "./pages/MinhasSolicitacoes";
import RequesterDashboard from "./pages/RequesterDashboard";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Solucoes from "./pages/Solucoes";
import Solicitacoes from "./pages/Solicitacoes";
import SolucoesKanban from "./pages/SolucoesKanban";
import SolicitacoesGantt from "./pages/SolicitacoesGantt";
import SolucoesGantt from "./pages/SolucoesGantt";


import SolicitacaoDetail from "./pages/SolicitacaoDetail";
import SolucaoDetail from "./pages/SolucaoDetail";
import Configuracoes from "./pages/Configuracoes";
import Diagrama from "./pages/Diagrama";
import Atividades from "./pages/Atividades";
import AtividadesBoard from "./pages/AtividadesBoard";
import ImportarQuadro from "./pages/atividades/importar/ImportarQuadro";

import Ajuda from "./pages/Ajuda";
import MeuPerfil from "./pages/MeuPerfil";
import ObservabilidadeIA from "./pages/ObservabilidadeIA";
import Consolidacao from "./pages/Consolidacao";
import Inbox from "./pages/Inbox";
import Operacoes from "./pages/Operacoes";
import DeveloperWorkspace from "./pages/DeveloperWorkspace";
import CommandCenter from "./pages/CommandCenter";
import Portal from "./pages/Portal";
import PortalIndex from "./pages/portal/PortalIndex";
import BaseConhecimentoAdmin from "./pages/admin/BaseConhecimento";
import Demandas from "./pages/admin/Demandas";
import AdminDashboard from "./pages/admin/Dashboard";
import SLAPolicies from "./pages/admin/SLAPolicies";
import WebhooksAdmin from "./pages/admin/Webhooks";
import WorkflowsPage from "./pages/admin/Workflows";
import WorkflowEditorPage from "./pages/admin/WorkflowEditor";
import WorkflowExecutionsPage from "./pages/admin/WorkflowExecutions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { authError, loading } = useAuth();
  if (authError && !loading) return <AuthErrorScreen />;
  return (
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

        {/* Trabalho — Inbox (Centro de Trabalho Inteligente) */}
        <Route path="/trabalho/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/operacoes" element={<ProtectedRoute role="developer"><Operacoes /></ProtectedRoute>} />
        <Route path="/workspace" element={<ProtectedRoute role="developer"><DeveloperWorkspace /></ProtectedRoute>} />

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
