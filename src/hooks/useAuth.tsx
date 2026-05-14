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

const DUAL_ROLE_EMAILS = new Set([
  "riccellycivil@gmail.com",
  "blococcomercial@gmail.com",
]);
const VIEW_AS_KEY = "viewAsRole";

const ALLOWED_ACCOUNTS: Record<string, { role: Role; nome: string }> = {
  "blococcomercial@gmail.com": { role: "developer", nome: "Bloco Comercial" },
  "riccellycivil@gmail.com": { role: "developer", nome: "Riccelly" },
  "atendimentoblocojp@gmail.com": { role: "requester", nome: "Atendimento JP" },
  "admblococonstrucoes@gmail.com": { role: "requester", nome: "Administrativo" },
  "planejamentoblococonstrucoes@gmail.com": { role: "requester", nome: "Planejamento" },
  "producaoblococonstrucoes@gmail.com": { role: "requester", nome: "Produção" },
  "rh@grupobloco.com.br": { role: "requester", nome: "Recursos Humanos" },
  "blocolegalizacao@gmail.com": { role: "requester", nome: "Legalização" },
  "ailton.apd@gmail.com": { role: "requester", nome: "Ailton" },
  "marianaporto827@gmail.com": { role: "requester", nome: "Mariana Porto" },
  "julianovicente.arquiteto@gmail.com": { role: "requester", nome: "Juliano Vicente" },
  "eng.vitoriaoliveira@gmail.com": { role: "requester", nome: "Vitória Oliveira" },
  "kamilly.lourdes@gmail.com": { role: "requester", nome: "Kamilly Lourdes" },
  "thaisalmedeiros@gmail.com": { role: "requester", nome: "Thais Medeiros" },
  "lccarneiro2@gmail.com": { role: "requester", nome: "L. Carneiro" },
  "karollainemont@gmail.com": { role: "requester", nome: "Karollaine Mont" },
  "pdutra60@gmail.com": { role: "requester", nome: "P. Dutra" },
  "raystefanyhingrid@gmail.com": { role: "requester", nome: "Ray Stefany Hingrid" },
  "matheussdn@live.com": { role: "requester", nome: "Matheus SDN" },
  "vitor.urtiga@gmail.com": { role: "requester", nome: "Vitor Urtiga" },
  "adrianocoattipt@gmail.com": { role: "requester", nome: "Adriano Coatti" },
  "thaywanfelipe02@gmail.com": { role: "requester", nome: "Thaywan Felipe" },
  "rodrigosarmento777@gmail.com": { role: "requester", nome: "Rodrigo Sarmento" },
  "fabiopb78@gmail.com": { role: "requester", nome: "Fabio PB" },
  "luispaulodelux@gmail.com": { role: "requester", nome: "Luis Paulo" },
  "lianaslacerda@gmail.com": { role: "requester", nome: "Liana Lacerda" },
  "mariacorretoramacedo@gmail.com": { role: "requester", nome: "Fernanda" },
};

export function getAllowedAccount(email?: string | null) {
  return email ? ALLOWED_ACCOUNTS[email.trim().toLowerCase()] : undefined;
}

function isDualEmail(email?: string | null) {
  return !!email && DUAL_ROLE_EMAILS.has(email.trim().toLowerCase());
}

function getStoredViewAs(): Role | null {
  const v = typeof window !== "undefined" ? localStorage.getItem(VIEW_AS_KEY) : null;
  return v === "developer" || v === "requester" ? v : null;
}

async function loadProfile(authUser: User): Promise<Profile> {
  const allowedAccount = getAllowedAccount(authUser.email);
  if (!allowedAccount) {
    throw new Error("Este aplicativo aceita apenas os logins autorizados.");
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("nome, email")
    .eq("id", authUser.id)
    .maybeSingle();

  const dual = isDualEmail(authUser.email);
  const stored = dual ? getStoredViewAs() : null;

  return {
    id: authUser.id,
    email: authUser.email ?? prof?.email ?? "",
    nome:
      prof?.nome ||
      (authUser.user_metadata?.nome as string | undefined) ||
      allowedAccount.nome,
    role: stored ?? allowedAccount.role,
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
    if (!getAllowedAccount(email)) {
      throw new Error("Use apenas um dos logins autorizados para acessar o aplicativo.");
    }

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
      // Only dual-role accounts may switch views. Ignore for everyone else.
      if (!isDualEmail(u.email)) return u;
      if (typeof window !== "undefined") localStorage.setItem(VIEW_AS_KEY, role);
      return { ...u, role };
    });
  }, []);

  const isDual = isDualEmail(user?.email);

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
