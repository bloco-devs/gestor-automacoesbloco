import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isPasswordRecoveryIntent } from "@/lib/auth-recovery";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";
import type { Role } from "@/lib/types";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  if (
    isPasswordRecoveryIntent({
      pathname: location.pathname,
      hash: location.hash,
      search: location.search,
    })
  ) {
    return <Navigate to={`/redefinir-senha${location.search}${location.hash}`} replace />;
  }

  /**
   * A ABERTURA DO SISTEMA.
   *
   * Aqui devolvia `null`: enquanto a sessão resolvia, a tela ficava em branco.
   * Funciona, mas não informa nada — em conexão lenta parece que o sistema não
   * carregou, e a reação natural é recarregar a página, o que reinicia a
   * espera.
   *
   * Isto não substitui padrão nenhum: antes não havia nada neste ponto.
   */
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <BlinkCarregando mensagem="Abrindo o sistema…" />
      </div>
    );
  }
  if (!user || !session) return <Navigate to="/auth" replace />;
  // Administrador (mesmo com viewAs em outro perfil) tem acesso pleno a rotas
  // protegidas por role="developer" para não ficar preso sem como voltar.
  const isAdminBypass = role === "developer" && !!user.isAdministrador;
  // Builder inherits all requester routes.
  const effectiveRole = user.role === "builder" ? "requester" : user.role;
  if (role && effectiveRole !== role && !isAdminBypass) {
    // O destino do solicitante era `/minhas-solicitacoes`, que lia a tabela
    // `solicitacoes` — esvaziada quando o sistema recomeçou. Esta linha é o
    // fundo de poço de todo acesso negado: quem não pode entrar numa rota cai
    // aqui. Apagar a rota antiga sem trocar este destino primeiro mandaria
    // todo solicitante barrado para um 404, e o barrado é justamente quem
    // menos tem como se orientar sozinho.
    return <Navigate to={user.role === "developer" ? "/workspace" : "/portal/demandas"} replace />;
  }

  return <>{children}</>;
}
