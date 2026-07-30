import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Ticket } from "lucide-react";
import { searchRegistry } from "../registry/search-registry";
import { getFavoritesSnapshot } from "../favorites/useGlobalFavorites";
import type { Demand } from "@/modules/demands/types";

/**
 * Registra providers dinâmicos de busca a partir do cache do React Query.
 * Não faz novas requisições: só expõe o que já está carregado.
 */
export function SpotlightProviders() {
  const qc = useQueryClient();

  useEffect(() => {
    searchRegistry.registerProvider("solicitacao", () => {
      const demands = qc.getQueryData<Demand[]>(["demands"]) ?? [];
      return demands.slice(0, 60).map((d) => {
        // O código de rastreio é o que a pessoa tem na mão (num e-mail, num
        // print). Buscar por ele precisa funcionar.
        const ref = d.ticket_code ?? `#${d.id.slice(0, 8)}`;
        return {
          id: d.id,
          type: "solicitacao" as const,
          label: d.title,
          description: `${ref} · ${d.status} · ${d.priority}`,
          keywords: [ref, d.priority, d.type, d.status, d.id.slice(0, 8)],
          route: `/workspace?d=${d.id}`,
          icon: Ticket,
        };
      });

    });

    // Favoritos globais aparecem como itens "nav" (topo dos resultados)
    searchRegistry.registerProvider("nav", () => {
      const favs = getFavoritesSnapshot();
      return favs
        .filter((f) => !!f.route)
        .map((f) => ({
          id: `fav-${f.kind}-${f.id}`,
          type: "nav" as const,
          label: `★ ${f.label}`,
          description: f.description ?? `Favorito · ${f.kind}`,
          route: f.route,
          icon: Star,
          keywords: ["favorito", f.kind],
        }));
    });
  }, [qc]);

  return null;
}
