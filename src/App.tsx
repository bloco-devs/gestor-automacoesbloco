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
import NovaDemanda from "./pages/NovaDemanda";
import MinhasDemandas from "./pages/MinhasDemandas";
import RequesterDashboard from "./pages/RequesterDashboard";
import Dashboard from "./pages/Dashboard";
import Kanban from "./pages/Kanban";
import Solucoes from "./pages/Solucoes";
import Solicitacoes from "./pages/Solicitacoes";

import DemandaDetail from "./pages/DemandaDetail";
import SolucaoDetail from "./pages/SolucaoDetail";
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
              <Route path="/minhas-demandas" element={<ProtectedRoute role="requester"><MinhasDemandas /></ProtectedRoute>} />
              <Route path="/nova-demanda" element={<ProtectedRoute role="requester"><NovaDemanda /></ProtectedRoute>} />

              {/* Desenvolvedor */}
              <Route path="/dashboard" element={<ProtectedRoute role="developer"><Dashboard /></ProtectedRoute>} />
              <Route path="/solicitacoes" element={<ProtectedRoute role="developer"><Solicitacoes /></ProtectedRoute>} />
              <Route path="/kanban" element={<ProtectedRoute role="developer"><Kanban /></ProtectedRoute>} />
              <Route path="/solucoes" element={<ProtectedRoute role="developer"><Solucoes /></ProtectedRoute>} />
              <Route path="/solucoes/:id" element={<ProtectedRoute role="developer"><SolucaoDetail /></ProtectedRoute>} />
              

              {/* Compartilhado */}
              <Route path="/demanda/:id" element={<DemandaDetail />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
