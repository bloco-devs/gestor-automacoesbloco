import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";
import { DEFAULT_PERSONA, translate } from "../dictionary";
import type { Persona, TermKey } from "../types";

interface LanguageContextValue {
  persona: Persona;
  t: (key: TermKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/** Mapeia o Role interno para a persona pública de linguagem. */
export function personaFromRole(role: Role | null | undefined): Persona {
  if (role === "developer") return "tecnica";
  if (role === "builder") return "tecnica"; // builder é híbrido — vê linguagem técnica
  if (role === "requester") return "solicitante";
  return DEFAULT_PERSONA;
}

interface Props {
  children: ReactNode;
  /** Força uma persona (útil para storybook / testes). */
  overridePersona?: Persona;
}

export function LanguageProvider({ children, overridePersona }: Props) {
  const auth = (() => {
    try { return useAuth(); } catch { return null; }
  })();
  const role = auth?.user?.role ?? null;

  const value = useMemo<LanguageContextValue>(() => {
    const persona = overridePersona ?? personaFromRole(role);
    return {
      persona,
      t: (key: TermKey) => translate(persona, key),
    };
  }, [overridePersona, role]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback silencioso: nunca quebra a UI se o provider não foi montado.
    return {
      persona: DEFAULT_PERSONA,
      t: (key) => translate(DEFAULT_PERSONA, key),
    };
  }
  return ctx;
}
