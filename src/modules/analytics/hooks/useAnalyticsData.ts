/**
 * useAnalyticsData — orquestra fontes existentes para o módulo Analytics.
 * Read-only. Cada fonte usa um cache key próprio no React Query.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getProfilesByIds,
  getUserWorkloads,
  listDemands,
} from "@/modules/demands/service";
import {
  listActiveWorkflows,
  listRecentLogs,
  listWorkflows,
} from "@/modules/workflow-runtime/service";
import { buildCandidatePool } from "@/modules/routing/services/routing-service";
import { fetchIaUsage } from "@/lib/iaUsage";
import type {
  AnalyticsFilters,
  AnalyticsResult,
} from "../types";
import {
  applyFilters,
  buildAiStats,
  buildDevRows,
  buildKnowledgeStats,
  buildRoutingStats,
  buildSlaStats,
  buildSystemRows,
  buildTrend,
  buildWorkflowStats,
  PERIOD_DAYS,
  periodSinceIso,
} from "../services/analytics-service";

const STALE = 30_000;

interface PlataformaRow {
  id: string;
  nome: string;
}

async function fetchPlataformas(): Promise<PlataformaRow[]> {
  const { data, error } = await supabase.from("plataformas").select("id, nome");
  if (error) return [];
  return (data ?? []) as PlataformaRow[];
}

interface KnowledgeArticleRow {
  id: string;
  titulo: string;
  views: number | null;
  status: string | null;
}

async function fetchKnowledgeArticles(): Promise<KnowledgeArticleRow[]> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id, titulo, views, status")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("views", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as KnowledgeArticleRow[];
}

interface KnowledgeFeedbackRow {
  resolved: boolean | null;
  article_id: string | null;
}

async function fetchKnowledgeFeedback(sinceIso: string): Promise<KnowledgeFeedbackRow[]> {
  const { data, error } = await supabase
    .from("knowledge_feedback")
    .select("resolved, article_id")
    .gte("created_at", sinceIso);
  if (error) return [];
  return (data ?? []) as KnowledgeFeedbackRow[];
}

export interface UseAnalyticsResult {
  data: AnalyticsResult | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAnalyticsData(filters: AnalyticsFilters): UseAnalyticsResult {
  const sinceIso = periodSinceIso(filters.period);

  const demandsQ = useQuery({
    queryKey: ["analytics", "demands"],
    queryFn: listDemands,
    staleTime: STALE,
  });

  const workloadsQ = useQuery({
    queryKey: ["analytics", "workloads"],
    queryFn: async () => {
      try {
        return await getUserWorkloads();
      } catch {
        return [];
      }
    },
    staleTime: STALE,
  });

  const candidatesQ = useQuery({
    queryKey: ["analytics", "candidates"],
    queryFn: async () => {
      try {
        return await buildCandidatePool();
      } catch {
        return [];
      }
    },
    staleTime: STALE,
  });

  const plataformasQ = useQuery({
    queryKey: ["analytics", "plataformas"],
    queryFn: fetchPlataformas,
    staleTime: 5 * 60_000,
  });

  const workflowLogsQ = useQuery({
    queryKey: ["analytics", "workflow-logs", filters.period],
    queryFn: async () => {
      const rows = await listRecentLogs(500).catch(() => []);
      const since = new Date(sinceIso).getTime();
      return rows.filter((r) => new Date(r.created_at).getTime() >= since);
    },
    staleTime: STALE,
  });

  const workflowDefsQ = useQuery({
    queryKey: ["analytics", "workflow-defs"],
    queryFn: async () => {
      const [all, active] = await Promise.all([
        listWorkflows().catch(() => []),
        listActiveWorkflows().catch(() => []),
      ]);
      return all.length >= active.length ? all : active;
    },
    staleTime: STALE,
  });

  const iaQ = useQuery({
    queryKey: ["analytics", "ia-usage", filters.period],
    queryFn: () => fetchIaUsage({ sinceIso, limit: 1000 }).catch(() => []),
    staleTime: STALE,
  });

  const articlesQ = useQuery({
    queryKey: ["analytics", "knowledge-articles"],
    queryFn: fetchKnowledgeArticles,
    staleTime: 5 * 60_000,
  });

  const feedbackQ = useQuery({
    queryKey: ["analytics", "knowledge-feedback", filters.period],
    queryFn: () => fetchKnowledgeFeedback(sinceIso),
    staleTime: STALE,
  });

  const ids = useMemo(() => {
    const set = new Set<string>();
    for (const d of demandsQ.data ?? []) if (d.assigned_to) set.add(d.assigned_to);
    for (const w of workloadsQ.data ?? []) set.add(w.user_id);
    return Array.from(set);
  }, [demandsQ.data, workloadsQ.data]);

  const profilesQ = useQuery({
    queryKey: ["analytics", "profiles", ids.join(",")],
    queryFn: () => getProfilesByIds(ids),
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
  });

  const data = useMemo<AnalyticsResult | null>(() => {
    if (!demandsQ.data) return null;
    const filtered = applyFilters(demandsQ.data, filters);
    const closed = filtered.filter((d) => d.status === "concluido").length;
    const open = filtered.length - closed;
    return {
      demandsFiltered: filtered,
      totalOpen: open,
      totalClosed: closed,
      trend: buildTrend(filtered, filters.period),
      devs: buildDevRows(
        filtered,
        workloadsQ.data ?? [],
        profilesQ.data ?? new Map(),
      ),
      systems: buildSystemRows(filtered, plataformasQ.data ?? []),
      workflows: buildWorkflowStats(
        workflowLogsQ.data ?? [],
        workflowDefsQ.data ?? [],
      ),
      knowledge: buildKnowledgeStats({
        publicados: (articlesQ.data ?? []).length,
        articles: articlesQ.data ?? [],
        feedback: feedbackQ.data ?? [],
      }),
      ai: buildAiStats(iaQ.data ?? []),
      sla: buildSlaStats(filtered),
      routing: buildRoutingStats(workloadsQ.data ?? [], candidatesQ.data ?? []),
    };
  }, [
    demandsQ.data,
    filters,
    workloadsQ.data,
    profilesQ.data,
    plataformasQ.data,
    workflowLogsQ.data,
    workflowDefsQ.data,
    articlesQ.data,
    feedbackQ.data,
    iaQ.data,
    candidatesQ.data,
  ]);

  const queries = [
    demandsQ,
    workloadsQ,
    candidatesQ,
    plataformasQ,
    workflowLogsQ,
    workflowDefsQ,
    iaQ,
    articlesQ,
    feedbackQ,
  ];
  const loading = queries.some((q) => q.isLoading);
  const errorQ = queries.find((q) => q.error);

  return {
    data,
    loading,
    error: (errorQ?.error as Error) ?? null,
    refetch: () => {
      for (const q of queries) void q.refetch();
    },
  };
}

export { PERIOD_DAYS };
