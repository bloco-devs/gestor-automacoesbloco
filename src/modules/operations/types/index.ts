/**
 * Operations Center — tipos públicos.
 * Módulo puramente agregador; não define novas entidades de banco.
 */
import type { Demand, UserWorkload } from "@/modules/demands/types";
import type { DemandMetrics } from "@/modules/dashboard/service";
import type { AppNotification } from "@/modules/notifications/service";

export interface CriticalItem {
  id: string;
  title: string;
  priority: Demand["priority"];
  status: Demand["status"];
  sla_status: Demand["sla_status"];
  sla_due_at: string | null;
  assigned_to: string | null;
  updated_at: string;
  reasons: string[];
  score: number;
  href: string;
}

export interface QueueBuckets {
  criticas: number;
  emAndamento: number;
  aguardandoCliente: number;
  concluidasHoje: number;
  semResponsavel: number;
  slaEstourado: number;
  slaEmAtencao: number;
}

export type ActivityKind =
  | "demand.created"
  | "demand.updated"
  | "comment.added"
  | "audit.change";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  demandId: string;
  title: string;
  actorId: string | null;
  summary: string;
  createdAt: string;
  href: string;
}

export type InsightSeverity = "info" | "attention" | "risk";

export interface OperationsInsight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
  action?: { label: string; href: string };
}

export interface OperationsSnapshot {
  metrics: DemandMetrics | null;
  buckets: QueueBuckets;
  critical: CriticalItem[];
  workloads: UserWorkload[];
  activity: ActivityItem[];
  insights: OperationsInsight[];
  alerts: AppNotification[];
}
