import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Result<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (/network|fetch|failed/i.test(msg)) return "Falha de conexão. Verifique sua internet e tente novamente.";
  if (/permission|denied|rls/i.test(msg)) return "Você não tem permissão para ver estes dados.";
  if (/timeout/i.test(msg)) return "A consulta demorou demais. Tente novamente.";
  return msg || "Ocorreu um erro inesperado ao carregar.";
}

/**
 * Variante aditiva de useSupabaseData que expõe loading/error e mantém a
 * mesma subscription realtime em tabelas do domínio.
 */
export function useSupabaseQuery<T>(loader: () => Promise<T>, deps: DependencyList = []): Result<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelNameRef = useRef(`domain-query-${crypto.randomUUID()}`);

  const refetch = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loader()
      .then((res) => {
        if (!active) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(friendly(err));
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const cancel = refetch();
    return cancel;
  }, [refetch]);

  useEffect(() => {
    const channel = supabase
      .channel(channelNameRef.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacoes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_solucoes" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_melhorias" }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_tasks" }, () => refetch())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { data, loading, error, refetch };
}

export default useSupabaseQuery;
