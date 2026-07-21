import { useCallback } from "react";
import { useLanguage } from "../providers/LanguageProvider";
import { FRIENDLY_ERRORS } from "../dictionary";
import type { FriendlyError, FriendlyErrorKey, TermKey } from "../types";

/** Retorna a função `t` para traduzir termos. */
export function useT() {
  const { t } = useLanguage();
  return t;
}

/** Retorna a persona atual (solicitante | tecnica | gestor). */
export function usePersona() {
  return useLanguage().persona;
}

/** true quando o usuário atual NÃO é técnico — para esconder jargão. */
export function useIsLayUser() {
  return useLanguage().persona !== "tecnica";
}

/** Retorna múltiplas traduções de uma vez (evita re-renders desnecessários). */
export function useTerms<K extends TermKey>(keys: readonly K[]): Record<K, string> {
  const { t } = useLanguage();
  return keys.reduce((acc, k) => {
    acc[k] = t(k);
    return acc;
  }, {} as Record<K, string>);
}

/** Resolve um erro cru em uma mensagem humanizada. */
export function useFriendlyError() {
  return useCallback((err: unknown): FriendlyError => {
    const msg = err instanceof Error ? err.message : String(err ?? "");
    return resolveFriendlyError(msg);
  }, []);
}

export function resolveFriendlyError(message: string): FriendlyError {
  const m = message.toLowerCase();
  const key: FriendlyErrorKey =
    /timeout|timed out|demorou/.test(m) ? "timeout" :
    /network|fetch|offline|failed to fetch/.test(m) ? "network" :
    /401|unauthor|permiss/.test(m) ? "unauthorized" :
    /404|not.?found/.test(m) ? "notFound" :
    /429|rate.?limit|muitas/.test(m) ? "rateLimit" :
    /5\d\d|server|internal/.test(m) ? "server" :
    "generic";
  return FRIENDLY_ERRORS[key];
}
