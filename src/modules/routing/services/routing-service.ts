/**
 * Serviço — monta o CandidatePool a partir de dados já existentes.
 * Reusa: profiles, get_user_workloads, demands.
 * Nenhuma nova tabela, RPC ou edge function.
 *
 * A equipe elegível é a união de:
 *   1) atendentes com carga ativa (get_user_workloads)
 *   2) atendentes com histórico de resolução nos últimos 90 dias
 */
import { supabase } from "@/integrations/supabase/client";
import { getUserWorkloads } from "@/modules/demands/service";
import type { Demand } from "@/modules/demands/types";
import { deriveHistory } from "../engine/affinity";
import type { Candidate } from "../types";

const HISTORY_DAYS = 90;

interface ProfileRow {
  id: string;
  nome: string | null;
  email: string | null;
  avatar_url: string | null;
}
interface ResolvedRow {
  id: string;
  assigned_to: string | null;
  status: Demand["status"];
  type: Demand["type"];
  priority: Demand["priority"];
  complexity: Demand["complexity"];
  created_at: string;
  updated_at: string;
}

async function fetchProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  const map = new Map<string, ProfileRow>();
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .in("id", ids);
  if (error) return map;
  for (const p of ((data as ProfileRow[] | null) ?? [])) map.set(p.id, p);
  return map;
}

async function fetchRecentResolved(): Promise<ResolvedRow[]> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("demands")
    .select("id, assigned_to, status, type, priority, complexity, created_at, updated_at")
    .eq("status", "concluido")
    .gte("updated_at", since)
    .limit(1000);
  if (error) throw error;
  return (data as ResolvedRow[] | null) ?? [];
}

export async function buildCandidatePool(): Promise<Candidate[]> {
  const [workloads, resolved] = await Promise.all([
    getUserWorkloads().catch(() => []),
    fetchRecentResolved().catch(() => [] as ResolvedRow[]),
  ]);

  const ids = new Set<string>();
  for (const w of workloads) ids.add(w.user_id);
  for (const r of resolved) if (r.assigned_to) ids.add(r.assigned_to);

  const workloadMap = new Map<string, (typeof workloads)[number]>();
  for (const w of workloads) workloadMap.set(w.user_id, w);
  const profiles = await fetchProfiles(Array.from(ids));

  const resolvedAsDemands = resolved as unknown as Demand[];

  return Array.from(ids).map<Candidate>((userId) => {
    const wl = workloadMap.get(userId);
    const prof = profiles.get(userId);
    const hist = deriveHistory(userId, resolvedAsDemands);
    return {
      user_id: userId,
      nome: prof?.nome ?? wl?.nome ?? null,
      email: prof?.email ?? wl?.email ?? null,
      avatar_url: prof?.avatar_url ?? wl?.avatar_url ?? null,
      active_count: wl?.active_count ?? 0,
      ...hist,
    };
  });
}
