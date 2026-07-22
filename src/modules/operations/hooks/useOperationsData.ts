import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listDemands, getUserWorkloads, getProfilesByIds } from "@/modules/demands/service";
import { computeMetrics, fetchDeflectionStats } from "@/modules/dashboard/service";
import { listNotifications } from "@/modules/notifications/service";
import type { Demand, UserProfileLite } from "@/modules/demands/types";
import {
  buildBuckets,
  fetchRecentActivity,
  rankCritical,
} from "../services/operations-service";
import { buildInsights } from "../services/insights-engine";
import type { OperationsSnapshot } from "../types";

const KEY = ["operations", "snapshot"] as const;

export interface UseOperationsResult {
  data: OperationsSnapshot | null;
  profiles: Map<string, UserProfileLite>;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

async function loadSnapshot(): Promise<OperationsSnapshot> {
  const [demands, workloads, deflection, alerts] = await Promise.all([
    listDemands(),
    getUserWorkloads().catch(() => []),
    fetchDeflectionStats().catch(() => ({ respondidasPorIA: 0, defletidasKB: 0 })),
    listNotifications(20).catch(() => []),
  ]);
  const activity = await fetchRecentActivity(demands, 20).catch(() => []);
  const metrics = computeMetrics(demands as Demand[], deflection);
  const buckets = buildBuckets(demands as Demand[]);
  const critical = rankCritical(demands as Demand[], 8);
  const insights = buildInsights(demands as Demand[], workloads);
  return { metrics, buckets, critical, workloads, activity, insights, alerts };
}

export function useOperationsData(): UseOperationsResult {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: loadSnapshot, staleTime: 30_000 });

  // Realtime — reutiliza canais existentes; apenas invalida a snapshot.
  useEffect(() => {
    const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
    const channel = supabase
      .channel(`operations-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "demands" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_audit_logs" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "demand_comments" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  // Carrega perfis dos responsáveis / autores que aparecem na tela
  const ids = useMemo(() => {
    if (!q.data) return [] as string[];
    const set = new Set<string>();
    for (const c of q.data.critical) if (c.assigned_to) set.add(c.assigned_to);
    for (const a of q.data.activity) if (a.actorId) set.add(a.actorId);
    for (const w of q.data.workloads) set.add(w.user_id);
    return Array.from(set);
  }, [q.data]);

  const profilesQuery = useQuery({
    queryKey: ["operations", "profiles", ids.join(",")],
    queryFn: () => getProfilesByIds(ids),
    enabled: ids.length > 0,
  });

  return {
    data: q.data ?? null,
    profiles: profilesQuery.data ?? new Map(),
    loading: q.isLoading,
    error: (q.error as Error) ?? null,
    refetch: () => void q.refetch(),
  };
}
