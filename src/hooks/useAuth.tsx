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
import {
  isPasswordRecoveryIntent,
  markPasswordRecoveryIntent,
  PASSWORD_RECOVERY_KEY,
} from "@/lib/auth-recovery";
import type { Profile, Role } from "@/lib/types";

export const PASSWORD_RESET_REDIRECT_URL =
  "https://gestor-automacoesbloco.lovable.app/redefinir-senha";

export function getPasswordResetRedirectUrl() {
  return PASSWORD_RESET_REDIRECT_URL;
}

interface AuthContextValue {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  authError: Error | null;
  retryAuth: () => void;
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

class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAllowedError";
  }
}

class AuthTimeoutError extends Error {
  constructor() {
    super("Tempo limite ao conectar ao servidor de autenticação.");
    this.name = "AuthTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new AuthTimeoutError()), ms);
    promise.then(
      (value) => { clearTimeout(id); resolve(value); },
      (err) => { clearTimeout(id); reject(err); },
    );
  });
}

async function loadProfileOnce(authUser: User): Promise<Profile & { isAdministrador: boolean }> {
  const [{ data: prof }, { data: roleStr, error: roleErr }, { data: allowed, error: allowedErr }] =
    await Promise.all([
      supabase.from("profiles").select("nome, email, avatar_url").eq("id", authUser.id).maybeSingle(),
      supabase.rpc("get_my_role"),
      supabase.rpc("is_allowed_user"),
    ]);

  if (roleErr || allowedErr) {
    // Erro técnico (rede, RPC). Não destruir sessão.
    throw new Error("Não foi possível verificar suas permissões. Tente novamente.");
  }

  if (!allowed) {
    throw new NotAllowedError("Este aplicativo aceita apenas os logins autorizados.");
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
    avatarUrl: (prof as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    isAdministrador,
  };
}

async function loadProfile(authUser: User): Promise<Profile & { isAdministrador: boolean }> {
  try {
    return await loadProfileOnce(authUser);
  } catch (err) {
    if (err instanceof NotAllowedError) throw err;
    // 1 retry após backoff curto para suavizar falhas transitórias
    await new Promise((r) => setTimeout(r, 500));
    return await loadProfileOnce(authUser);
  }
}

async function handleLoadProfileError(err: unknown, setUser: (p: Profile | null) => void) {
  if (err instanceof NotAllowedError) {
    setUser(null);
    await supabase.auth.signOut();
    return;
  }
  // Erro técnico: preservar a sessão (refresh token) para não forçar relogin.
  console.warn("[auth] loadProfile falhou (sessão preservada):", err);
  setUser(null);
}

export { NotAllowedError };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);

  useEffect(() => {
    // 1) Listener PRIMEIRO (recomendado pela Supabase)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const recoveryFlag =
        typeof window !== "undefined" &&
        sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === "1";
      const isRecoveryFlow =
        _event === "PASSWORD_RECOVERY" || (_event === "SIGNED_IN" && recoveryFlag);

      if (isRecoveryFlow) {
        markPasswordRecoveryIntent();
        setSession(newSession);
        // Não carrega o profile durante recovery para evitar redirecionamentos de role.
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/redefinir-senha")
        ) {
          window.location.replace("/redefinir-senha");
        }
        return;
      }

      setSession(newSession);
      if (!newSession) {
        setUser(null);
        return;
      }
      // Defer Supabase calls to avoid deadlock no callback
      setTimeout(() => {
        loadProfile(newSession.user)
          .then(setUser)
          .catch((err) => handleLoadProfileError(err, setUser));
      }, 0);
    });

    // 2) Depois recupera sessão atual (com timeout para evitar tela preta se o servidor travar)
    withTimeout(supabase.auth.getSession(), 8000)
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session) {
          if (isPasswordRecoveryIntent()) {
            // Em fluxo de recovery, não carregar profile (evita redirect de role).
            setLoading(false);
            if (
              typeof window !== "undefined" &&
              !window.location.pathname.startsWith("/redefinir-senha")
            ) {
              window.location.replace("/redefinir-senha");
            }
            return;
          }
          try {
            setUser(await loadProfile(data.session.user));
          } catch (err) {
            await handleLoadProfileError(err, setUser);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[auth] getSession falhou:", err);
        setAuthError(err instanceof Error ? err : new Error(String(err)));
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

  const retryAuth = useCallback(() => {
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const isDual = !!user?.isAdministrador;

  const value = useMemo(
    () => ({ user, session, loading, authError, retryAuth, signIn, signOut, isDual, setViewAs }),
    [user, session, loading, authError, retryAuth, signIn, signOut, isDual, setViewAs],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
