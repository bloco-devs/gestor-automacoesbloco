/**
 * ContextProvider — ponte React ↔ ContextEngine.
 *
 * Responsabilidades:
 * - Sincronizar a rota atual (React Router) com o engine.
 * - Espelhar o usuário autenticado no engine.
 * - Expor o engine via React context para hooks/selectors.
 *
 * Toda a lógica de domínio vive no engine (framework-agnóstico); este arquivo
 * é a única fronteira que conhece React.
 */
import { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { contextEngine, type ContextEngine } from "./context-engine";

const ReactContextEngine = createContext<ContextEngine>(contextEngine);

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const engine = contextEngine;
  const location = useLocation();
  const auth = useAuth();

  // Sincroniza rota — o engine só re-emite se mudou.
  useEffect(() => {
    engine.setRoute(location.pathname + location.search);
  }, [engine, location.pathname, location.search]);

  // Espelha usuário autenticado.
  useEffect(() => {
    const rawRole = (auth as unknown as { role?: string | null }).role ?? null;
    const role =
      rawRole === "requester" || rawRole === "developer" || rawRole === "admin" || rawRole === "guest"
        ? rawRole
        : null;
    engine.setCurrentUser({
      id: auth.user?.id ?? null,
      role,
    });
  }, [engine, auth.user?.id, (auth as unknown as { role?: string }).role]);

  const value = useMemo(() => engine, [engine]);
  return <ReactContextEngine.Provider value={value}>{children}</ReactContextEngine.Provider>;
}

export function useContextEngine(): ContextEngine {
  return useContext(ReactContextEngine);
}
