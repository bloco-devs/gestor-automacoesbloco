import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Profile, Role } from "@/lib/types";

interface AuthContextValue {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<Profile>;
  signUp: (nome: string, email: string, senha: string) => Promise<Profile>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(authUser: User): Promise<Profile> {
  // Busca nome do perfil (criado por trigger no signup)
  const { data: prof } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", authUser.id)
    .maybeSingle();

  // Determina role consultando user_roles (server-side, autoritativo)
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id);

  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  const role: Role = isAdmin ? "developer" : "requester";

  return {
    id: authUser.id,
    email: prof?.email ?? authUser.email ?? "",
    nome:
      prof?.nome ||
      (authUser.user_metadata?.nome as string | undefined) ||
      (authUser.email?.split("@")[0] ?? "Usuário"),
    role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Listener PRIMEIRO (recomendado pela Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setUser(null);
        return;
      }
      // Defer Supabase calls to avoid deadlock no callback
      setTimeout(() => {
        loadProfile(newSession.user).then(setUser).catch(() => setUser(null));
      }, 0);
    });

    // 2) Depois recupera sessão atual
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        try {
          setUser(await loadProfile(data.session.user));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Falha ao entrar.");
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  }, []);

  const signUp = useCallback(async (nome: string, email: string, senha: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: redirectUrl,
        data: { nome },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Falha ao criar conta.");
    // Se confirmação de email estiver desativada, já há sessão.
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, loading, signIn, signUp, signOut }),
    [user, session, loading, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
