/**
 * Serviço — monta o CandidatePool a partir de dados já existentes.
 * Reusa: user_roles, profiles, get_user_workloads, demands.
 * Nenhuma nova tabela, RPC ou edge function.
 */
import { supabase } from "@/integrations/supabase/client";
import { getUserWorkloads } from "@/modules/demands/service";
import type { Demand } from "@/modules/demands/types";
import { deriveHistory } from "../engine/affinity";
import type { Candidate } from "../types";

const HISTORY_DAYS = 90;

interface RoleRow {
  user_id: string;
}
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

async function fetchDevelopers(): Promise<ProfileRow[]> {
  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "developer");
  if (rolesErr) throw rolesErr;
  const ids = Array.from(new Set(((roles as RoleRow[] | null) ?? []).map((r) => r.user_id))).filter(Boolean);
  if (ids.length === 0) return [];
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .in("id", ids);
  if (pErr) throw pErr;
  return (profiles as ProfileRow[] | null) ?? [];
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
  const [developers, workloads, resolved] = await Promise.all([
    fetchDevelopers(),
    getUserWorkloads().catch(() => []),
    fetchRecentResolved().catch(() => [] as ResolvedRow[]),
  ]);

  const workloadMap = new Map(workloads.map((w) => [w.user_id, w]));
  const resolvedAsDemands = resolved as unknown as Demand[];

  return developers.map<Candidate>((p) => {
    const wl = workloadMap.get(p.id);
    const hist = deriveHistory(p.id, resolvedAsDemands);
    return {
      user_id: p.id,
      nome: p.nome ?? wl?.nome ?? null,
      email: p.email ?? wl?.email ?? null,
      avatar_url: p.avatar_url ?? wl?.avatar_url ?? null,
      active_count: wl?.active_count ?? 0,
      ...hist,
    };
  });
}
