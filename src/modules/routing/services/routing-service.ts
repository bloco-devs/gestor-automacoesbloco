/**
 * Serviço — monta o CandidatePool a partir de dados já existentes.
 * Reusa: profiles, get_user_workloads, demands, plataformas, knowledge_articles.
 * Nenhuma nova tabela, RPC ou edge function.
 *
 * A equipe elegível é a união de:
 *   1) atendentes com carga ativa (get_user_workloads)
 *   2) atendentes com histórico de resolução nos últimos 90 dias
 *
 * F018.4 — passamos também `system_id` + `sla_status` (usados na afinidade por
 * sistema) e agregamos artigos de Knowledge por (autor, slug).
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
  system_id: string | null;
  sla_status: Demand["sla_status"] | null;
  created_at: string;
  updated_at: string;
}

interface PlataformaRow {
  id: string;
  nome: string | null;
}
interface KnowledgeRow {
  autor_id: string | null;
  sistema_slug: string | null;
}

function slugify(v: string | null | undefined): string | null {
  if (!v) return null;
  return v
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || null;
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
    .select(
      "id, assigned_to, status, type, priority, complexity, system_id, sla_status, created_at, updated_at",
    )
    .eq("status", "concluido")
    .gte("updated_at", since)
    .limit(1000);
  if (error) throw error;
  return (data as ResolvedRow[] | null) ?? [];
}

/**
 * `plataformas` não tem coluna `slug`. Derivamos slug ← slugify(nome).
 * Retornamos o map inverso `slug → id` para traduzir `knowledge_articles.sistema_slug`
 * ao mesmo espaço de chaves usado no histórico por sistema (system_id).
 */
async function fetchPlataformaSlugToId(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await supabase.from("plataformas").select("id, nome");
  if (error) return map;
  for (const p of (data as PlataformaRow[] | null) ?? []) {
    const s = slugify(p.nome);
    if (s) map.set(s, p.id);
  }
  return map;
}

/**
 * Retorna `Map<user_id, Map<system_id, count>>` já traduzido do slug do artigo
 * para o `system_id` correspondente. Slugs sem match ficam de fora.
 */
async function fetchKnowledgeAuthorship(
  slugToId: Map<string, string>,
): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>();
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("autor_id, sistema_slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(2000);
  if (error) return out;
  for (const a of (data as KnowledgeRow[] | null) ?? []) {
    if (!a.autor_id || !a.sistema_slug) continue;
    const systemId = slugToId.get(a.sistema_slug);
    if (!systemId) continue;
    const bucket = out.get(a.autor_id) ?? new Map<string, number>();
    bucket.set(systemId, (bucket.get(systemId) ?? 0) + 1);
    out.set(a.autor_id, bucket);
  }
  return out;
}

export async function buildCandidatePool(): Promise<Candidate[]> {
  const [workloads, resolved, slugToId] = await Promise.all([
    getUserWorkloads().catch(() => []),
    fetchRecentResolved().catch(() => [] as ResolvedRow[]),
    fetchPlataformaSlugToId().catch(() => new Map<string, string>()),
  ]);
  const docs = await fetchKnowledgeAuthorship(slugToId).catch(
    () => new Map<string, Map<string, number>>(),
  );

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
    // Histórico é indexado pelo próprio `system_id` (mesma chave que o consumidor
    // usa em `demand.system_slug`), mantendo o motor agnóstico do formato do slug.
    const hist = deriveHistory(userId, resolvedAsDemands, {
      docsBySystem: docs.get(userId),
    });
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
