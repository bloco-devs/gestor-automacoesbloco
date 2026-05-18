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
  signOut: () => Promise<void>;
  isDual: boolean;
  setViewAs: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const VIEW_AS_KEY = "viewAsRole";

function getStoredViewAs(): Role | null {
  const v = typeof window !== "undefined" ? localStorage.getItem(VIEW_AS_KEY) : null;
  return v === "developer" || v === "requester" || v === "builder" ? v : null;
}

async function loadProfile(authUser: User): Promise<Profile & { isAdministrador: boolean }> {
  const [{ data: prof }, { data: roleStr, error: roleErr }, { data: allowed, error: allowedErr }] =
    await Promise.all([
      supabase.from("profiles").select("nome, email").eq("id", authUser.id).maybeSingle(),
      supabase.rpc("get_my_role"),
      supabase.rpc("is_allowed_user"),
    ]);

  if (roleErr || allowedErr) {
    throw new Error("Não foi possível verificar suas permissões. Tente novamente.");
  }

  if (!allowed) {
    throw new Error("Este aplicativo aceita apenas os logins autorizados.");
  }

  const isAdministrador = roleStr === "administrador";
  const dbRole: Role = isAdministrador
    ? "developer"
    : roleStr === "developer"
      ? "developer"
      : roleStr === "builder"
        ? "builder"
        : "requester";

  const stored = isAdministrador ? getStoredViewAs() : null;

  return {
    id: authUser.id,
    email: authUser.email ?? prof?.email ?? "",
    nome:
      prof?.nome ||
      (authUser.user_metadata?.nome as string | undefined) ||
      (authUser.email ? authUser.email.split("@")[0] : "Usuário"),
    role: stored ?? dbRole,
    isAdministrador,
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
        loadProfile(newSession.user).then(setUser).catch(async () => {
          setUser(null);
          await supabase.auth.signOut();
        });
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
          await supabase.auth.signOut();
        }
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Falha ao entrar.");
    const profile = await loadProfile(data.user);
    setUser(profile);
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    if (typeof window !== "undefined") localStorage.removeItem(VIEW_AS_KEY);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const setViewAs = useCallback((role: Role) => {
    setUser((u) => {
      if (!u) return u;
      // Only Administradores may switch views. Ignore for everyone else.
      if (!u.isAdministrador) return u;
      if (typeof window !== "undefined") localStorage.setItem(VIEW_AS_KEY, role);
      return { ...u, role };
    });
  }, []);

  const isDual = !!user?.isAdministrador;

  const value = useMemo(
    () => ({ user, session, loading, signIn, signOut, isDual, setViewAs }),
    [user, session, loading, signIn, signOut, isDual, setViewAs],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
