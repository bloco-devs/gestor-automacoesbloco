import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return <Navigate to={user.role === "developer" ? "/dashboard" : "/minhas-solicitacoes"} replace />;
};

export default Index;
