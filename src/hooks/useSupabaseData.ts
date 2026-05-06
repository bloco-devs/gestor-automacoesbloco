import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSupabaseData<T>(loader: () => Promise<T>, fallback: T, deps: DependencyList = []): T {
  const [value, setValue] = useState<T>(fallback);
  const channelNameRef = useRef(`domain-data-changes-${crypto.randomUUID()}`);

  const refresh = useCallback(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setValue(data);
      })
      .catch(() => {
        if (active) setValue(fallback);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => refresh(), [refresh]);

  useEffect(() => {
    const channel = supabase
      .channel(channelNameRef.current)
      .on("postgres_changes", { event: "*", schema: "public", table: "solicitacoes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_solucoes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_melhorias" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_tasks" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return value;
}
