import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SISTEMAS_SEED } from "@/lib/ecossistemaSeed";

export interface SistemaAlvoOption {
  id: string; // slug
  nome: string;
  grupo?: string | null;
  status?: string | null;
}

/**
 * Onda A1 — Lista de sistemas para o seletor "Sistema do ecossistema".
 * Tenta o HUB via edge `ecossistema-mapa`; degrada para o seed em qualquer falha.
 */
export function useEcossistemaSistemas(enabled: boolean) {
  const [sistemas, setSistemas] = useState<SistemaAlvoOption[]>([]);
  const [fonte, setFonte] = useState<"hub" | "semente" | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ecossistema-mapa");
        if (error) throw error;
        const arr = Array.isArray(data?.sistemas) ? data.sistemas : null;
        if (arr && arr.length > 0) {
          if (!active) return;
          setSistemas(
            arr.map((s: { id: string; nome: string; grupo?: string | null; status?: string | null }) => ({
              id: s.id,
              nome: s.nome,
              grupo: s.grupo ?? null,
              status: s.status ?? null,
            })),
          );
          setFonte(data?.fonte === "hub" ? "hub" : "semente");
          return;
        }
        throw new Error("sem sistemas");
      } catch {
        if (!active) return;
        setSistemas(SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo })));
        setFonte("semente");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled]);

  return { sistemas, fonte, loading };
}
