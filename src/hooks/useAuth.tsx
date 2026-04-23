import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Profile } from "@/lib/types";
import { currentUser, signIn as doSignIn, signOut as doSignOut, signUp as doSignUp, subscribe } from "@/lib/store";

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<Profile>;
  signUp: (nome: string, email: string, senha: string) => Promise<Profile>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(() => currentUser());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = subscribe(() => setUser(currentUser()));
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    setLoading(true);
    try {
      const u = doSignIn(email, senha);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (nome: string, email: string, senha: string) => {
    setLoading(true);
    try {
      const u = doSignUp(nome, email, senha);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    doSignOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
