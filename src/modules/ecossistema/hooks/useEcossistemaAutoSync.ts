/**
 * useEcossistemaAutoSync — mantém o Ecossistema sincronizado automaticamente.
 *
 * Escuta canais Realtime existentes (nada novo é criado):
 *  - `solicitacoes` (novas demandas / mudanças de sistema-alvo / desfechos)
 *  - `solucoes` (novas soluções / mudanças de arquitetura)
 *  - `knowledge_articles` (nova documentação)
 *
 * Em qualquer evento relevante agenda o `reprocessar-matches` via
 * `scheduleReprocessarMatches` (debounce 30s + cooldown 5min).
 * Também invalida as queries de saúde para forçar refresh nas telas abertas.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { scheduleReprocessarMatches } from "../services/reprocessador";

export function useEcossistemaAutoSync(enabled: boolean = true): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["ecossistema"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    };

    const trigger = (reason: string) => {
      scheduleReprocessarMatches(reason);
      invalidate();
    };

    const channel = supabase
      .channel("ecossistema:auto-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "solicitacoes" },
        () => trigger("solicitacoes.insert"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solicitacoes", filter: "desfecho=neq.null" },
        () => trigger("solicitacoes.desfecho"),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "solucoes" },
        () => trigger("solucoes.insert"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solucoes" },
        () => trigger("solucoes.update"),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "knowledge_articles" },
        () => trigger("knowledge.insert"),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
