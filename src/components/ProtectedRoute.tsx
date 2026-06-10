import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { isPasswordRecoveryIntent } from "@/lib/auth-recovery";
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

  if (loading) return null;
  if (!user || !session) return <Navigate to="/auth" replace />;
  // Builder inherits all requester routes.
  const effectiveRole = user.role === "builder" ? "requester" : user.role;
  if (role && effectiveRole !== role) {
    return <Navigate to={user.role === "developer" ? "/dashboard" : "/minhas-solicitacoes"} replace />;
  }
  return <>{children}</>;
}
