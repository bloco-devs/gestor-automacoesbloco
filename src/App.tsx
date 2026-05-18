import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import RedefinirSenha from "./pages/RedefinirSenha";
import EscolherPerfil from "./pages/EscolherPerfil";
import SolicitarSolucao from "./pages/SolicitarSolucao";
import NovaSolicitacao from "./pages/NovaSolicitacao";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/escolher-perfil" element={<ProtectedRoute><EscolherPerfil /></ProtectedRoute>} />
            <Route path="/solicitar" element={<SolicitarSolucao />} />
            <Route path="/" element={<Index />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              {/* Solicitante */}
              <Route path="/dashboard-solicitante" element={<ProtectedRoute role="requester"><RequesterDashboard /></ProtectedRoute>} />
              <Route path="/minhas-solicitacoes" element={<ProtectedRoute role="requester"><MinhasSolicitacoes /></ProtectedRoute>} />
              <Route path="/nova-solicitacao" element={<ProtectedRoute role="requester"><NovaSolicitacao /></ProtectedRoute>} />

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

              

              {/* Compartilhado */}
              <Route path="/solicitacao/:id" element={<SolicitacaoDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
