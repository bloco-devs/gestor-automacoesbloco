import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcossistemaCandidato {
  sistema_slug: string;
  nome: string;
  modulo: string | null;
  url_app: string | null;
  confianca: number;
  justificativa: string;
}

interface MatchState {
  candidatos: EcossistemaCandidato[];
  loading: boolean;
  fonte: "hub" | "indisponivel" | null;
}

interface Options {
  /** Só executa a partir deste tamanho. */
  minChars?: number;
  /** Debounce em ms. */
  delay?: number;
  /** Desativa temporariamente (ex.: durante submit). */
  enabled?: boolean;
  /** Slug de sistema-alvo previamente escolhido. */
  sistemaAlvoSlug?: string | null;
}

/**
 * Consulta a edge `match-ecossistema` com debounce.
 * Reaproveita a função existente — nenhum backend novo.
 */
export function useEcossistemaMatch(
  titulo: string,
  descricao: string,
  opts: Options = {},
): MatchState {
  const { minChars = 30, delay = 500, enabled = true, sistemaAlvoSlug = null } = opts;
  const [state, setState] = useState<MatchState>({ candidatos: [], loading: false, fonte: null });
  const cancelRef = useRef(false);

  useEffect(() => {
    const text = descricao.trim();
    if (!enabled || text.length < minChars) {
      setState({ candidatos: [], loading: false, fonte: null });
      return;
    }
    cancelRef.current = false;
    setState((s) => ({ ...s, loading: true }));
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("match-ecossistema", {
          body: {
            titulo: titulo.trim().slice(0, 120),
            descricao: text,
            sistema_alvo_slug: sistemaAlvoSlug,
          },
        });
        if (cancelRef.current) return;
        if (error) {
          setState({ candidatos: [], loading: false, fonte: null });
          return;
        }
        const list = Array.isArray(data?.candidatos) ? (data.candidatos as EcossistemaCandidato[]) : [];
        setState({
          candidatos: list,
          loading: false,
          fonte: data?.fonte === "hub" ? "hub" : "indisponivel",
        });
      } catch {
        if (!cancelRef.current) setState({ candidatos: [], loading: false, fonte: null });
      }
    }, delay);
    return () => {
      cancelRef.current = true;
      window.clearTimeout(timer);
    };
  }, [titulo, descricao, enabled, minChars, delay, sistemaAlvoSlug]);

  return state;
}
