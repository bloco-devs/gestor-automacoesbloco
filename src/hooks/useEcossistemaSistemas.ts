import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SISTEMAS_SEED } from "@/lib/ecossistemaSeed";
import { comDestinosFora } from "@/domain/demand/services/destinosForaDoEcossistema";

export interface SistemaAlvoOption {
  id: string; // slug
  nome: string;
  grupo?: string | null;
  status?: string | null;
}

/**
 * Onda A1 — Lista de sistemas para o seletor "Sistema do ecossistema".
 * Tenta o HUB via edge `ecossistema-mapa`; degrada para o seed em qualquer falha.
 *
 * A LISTA SAI DAQUI COM UM ITEM QUE O HUB NÃO TEM.
 *
 * "Tecnologia" é acrescentada no fim, pelo `comDestinosFora`, para existir um
 * destino válido quando a demanda não é de nenhum sistema — n8n, o site, uma
 * integração com terceiro. Sem ele, o único desfecho possível era `null`, e
 * `null` vira código adivinhado pelo título.
 *
 * Ela vale SÓ nesse caso. Havendo sistema que sirva, é o sistema que vence:
 * por isso entra por último na lista, que é a ordem em que pessoa e modelo
 * consideram as opções.
 *
 * Este hook alimenta o seletor de demanda e o Blink. O Escritório NÃO passa
 * por aqui — ele lê a `ecossistema-mapa` direto, e continua desenhando só os
 * sistemas que o HUB declara. Era o risco de resolver isto pelo HUB: dar mesa,
 * monitor e porta no andar para algo que não é sistema.
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
            comDestinosFora(
              arr.map((s: { id: string; nome: string; grupo?: string | null; status?: string | null }) => ({
                id: s.id,
                nome: s.nome,
                grupo: s.grupo ?? null,
                status: s.status ?? null,
              })),
            ),
          );
          setFonte(data?.fonte === "hub" ? "hub" : "semente");
          return;
        }
        throw new Error("sem sistemas");
      } catch {
        if (!active) return;
        setSistemas(
          comDestinosFora(SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo }))),
        );
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
