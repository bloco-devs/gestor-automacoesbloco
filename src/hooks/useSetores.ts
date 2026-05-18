import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listSetores, type SetorRow } from "@/lib/setores";
import { SETORES } from "@/lib/types";

/** Lista os setores cadastrados no banco, com realtime. */
export function useSetoresRows(): { rows: SetorRow[]; refresh: () => void } {
  const [rows, setRows] = useState<SetorRow[]>([]);

  const refresh = useCallback(() => {
    listSetores().then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`setores-changes-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "setores" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { rows, refresh };
}

/**
 * Retorna lista de nomes de setores disponíveis (DB + fallback legado),
 * deduplicada e ordenada em pt-BR.
 */
export function useSetoresNomes(): string[] {
  const { rows } = useSetoresRows();
  const set = new Set<string>(SETORES as readonly string[]);
  for (const r of rows) if (r.nome) set.add(r.nome);
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
