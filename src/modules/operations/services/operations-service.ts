/**
 * Operations Service — agrega dados de módulos existentes.
 * Não cria tabelas nem edge functions; usa apenas queries já suportadas por RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Demand } from "@/modules/demands/types";
import type { ActivityItem, CriticalItem, QueueBuckets } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const PRIORITY_WEIGHT: Record<Demand["priority"], number> = {
  baixa: 10,
  media: 30,
  alta: 60,
  critica: 100,
};

const STATUS_WEIGHT: Partial<Record<Demand["status"], number>> = {
  em_desenvolvimento: 40,
  em_testes: 30,
  homologacao: 25,
  a_fazer: 20,
  backlog: 5,
  concluido: 0,
};

export function scoreDemand(d: Demand, now = Date.now()): CriticalItem {
  const reasons: string[] = [];
  let score = PRIORITY_WEIGHT[d.priority] ?? 0;
  score += STATUS_WEIGHT[d.status] ?? 0;

  if (d.priority === "critica") reasons.push("Prioridade crítica");
  if (d.sla_status === "estourado") {
    score += 250;
    reasons.push("SLA vencido");
  } else if (d.sla_status === "atencao") {
    score += 120;
    reasons.push("SLA em atenção");
  }
  if (!d.assigned_to) {
    score += 40;
    reasons.push("Sem responsável");
  }
  const updated = new Date(d.updated_at).getTime();
  if (Number.isFinite(updated)) {
    const stopped = (now - updated) / DAY_MS;
    if (stopped >= 3) {
      score += Math.min(80, stopped * 10);
      reasons.push(`Parado há ${Math.floor(stopped)}d`);
    }
  }

  return {
    id: d.id,
    title: d.title,
    priority: d.priority,
    status: d.status,
    sla_status: d.sla_status,
    sla_due_at: d.sla_due_at,
    assigned_to: d.assigned_to,
    updated_at: d.updated_at,
    reasons,
    score: Math.round(score),
    href: `/admin/demandas?demand=${d.id}`,
  };
}

export function buildBuckets(demands: Demand[], now = Date.now()): QueueBuckets {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const startMs = todayStart.getTime();

  let criticas = 0;
  let emAndamento = 0;
  let aguardandoCliente = 0;
  let concluidasHoje = 0;
  let semResponsavel = 0;
  let slaEstourado = 0;
  let slaEmAtencao = 0;

  for (const d of demands) {
    if (d.status !== "concluido") {
      if (d.priority === "critica") criticas++;
      if (d.status === "em_desenvolvimento" || d.status === "em_testes") emAndamento++;
      if (d.status === "homologacao") aguardandoCliente++;
      if (!d.assigned_to) semResponsavel++;
      if (d.sla_status === "estourado") slaEstourado++;
      if (d.sla_status === "atencao") slaEmAtencao++;
    } else {
      const finished = new Date(d.updated_at).getTime();
      if (Number.isFinite(finished) && finished >= startMs) concluidasHoje++;
    }
  }

  return {
    criticas,
    emAndamento,
    aguardandoCliente,
    concluidasHoje,
    semResponsavel,
    slaEstourado,
    slaEmAtencao,
  };
}

export function rankCritical(demands: Demand[], limit = 8, now = Date.now()): CriticalItem[] {
  return demands
    .filter((d) => d.status !== "concluido")
    .map((d) => scoreDemand(d, now))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// -------- Atividade recente (audit + comments + created) ----------
interface RawAudit {
  id: string;
  demand_id: string;
  user_id: string | null;
  action: string;
  field_name: string | null;
  new_value: string | null;
  created_at: string;
}
interface RawComment {
  id: string;
  demand_id: string;
  user_id: string | null;
  content: string;
  is_internal: boolean;
  is_ai?: boolean;
  created_at: string;
}

export async function fetchRecentActivity(demands: Demand[], limit = 20): Promise<ActivityItem[]> {
  const titleById = new Map(demands.map((d) => [d.id, d.title]));
  const ids = demands.slice(0, 200).map((d) => d.id); // limite razoável de escopo
  const items: ActivityItem[] = [];

  // Últimas criações
  for (const d of demands.slice(0, 10)) {
    items.push({
      id: `created-${d.id}`,
      kind: "demand.created",
      demandId: d.id,
      title: d.title,
      actorId: d.created_by,
      summary: "criou a solicitação",
      createdAt: d.created_at,
      href: `/admin/demandas?demand=${d.id}`,
    });
  }

  if (ids.length > 0) {
    const { data: audits } = await supabase
      .from("demand_audit_logs" as never)
      .select("id, demand_id, user_id, action, field_name, new_value, created_at")
      .in("demand_id", ids as never)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const a of (audits ?? []) as unknown as RawAudit[]) {
      items.push({
        id: `audit-${a.id}`,
        kind: "audit.change",
        demandId: a.demand_id,
        title: titleById.get(a.demand_id) ?? "Solicitação",
        actorId: a.user_id,
        summary: a.field_name
          ? `alterou ${a.field_name}${a.new_value ? ` → ${a.new_value}` : ""}`
          : a.action,
        createdAt: a.created_at,
        href: `/admin/demandas?demand=${a.demand_id}`,
      });
    }

    const { data: comments } = await supabase
      .from("demand_comments" as never)
      .select("id, demand_id, user_id, content, is_internal, is_ai, created_at")
      .in("demand_id", ids as never)
      .order("created_at", { ascending: false })
      .limit(limit);
    for (const c of (comments ?? []) as unknown as RawComment[]) {
      items.push({
        id: `comment-${c.id}`,
        kind: "comment.added",
        demandId: c.demand_id,
        title: titleById.get(c.demand_id) ?? "Solicitação",
        actorId: c.user_id,
        summary: c.is_ai ? "IA respondeu" : c.is_internal ? "nota interna" : "comentou",
        createdAt: c.created_at,
        href: `/admin/demandas?demand=${c.demand_id}`,
      });
    }
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
