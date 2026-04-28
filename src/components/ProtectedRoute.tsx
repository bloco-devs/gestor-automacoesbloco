import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";

export function ProtectedRoute({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: Role;
}) {
  const { user, session, loading } = useAuth();
  if (loading) return null;
  if (!user || !session) return <Navigate to="/auth" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "developer" ? "/dashboard" : "/minhas-demandas"} replace />;
  }
  return <>{children}</>;
}
