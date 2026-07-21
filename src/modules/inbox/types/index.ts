/**
 * Tipos do módulo Inbox (Centro de Trabalho Inteligente).
 * Puros — sem dependências de React, Router ou Supabase.
 */
import type { PipelineStatus } from "@/lib/types";

export type InboxSeverity = "critical" | "in_progress" | "waiting_qa" | "done_today";

export interface InboxItem {
  id: string;
  title: string;
  system?: string | null;
  status: PipelineStatus;
  priority: number; // 0-100 (score final ou heurística)
  responsibleId?: string | null;
  responsibleName?: string | null;
  requesterId: string;
  requesterName: string;
  tags: string[];
  sprint?: string | null;
  sla?: string | null; // ISO date
  updatedAt: string; // ISO
  createdAt: string;
  href: string; // rota para "Continuar"
}

export interface InboxSummaryCounts {
  critical: number;
  inProgress: number;
  waitingQa: number;
  doneToday: number;
  total: number;
}

export interface RankedInboxItem extends InboxItem {
  score: number; // score de priorização local (0-1000)
  reasons: string[]; // razões humanamente legíveis
  ageDays: number;
}

export interface InboxInsight {
  id: string;
  kind: "warning" | "info" | "success";
  message: string;
}

export interface RecentActivityItem {
  id: string;
  kind: "created" | "status_changed" | "assigned" | "commented" | "approved" | "qa";
  title: string;
  when: string; // ISO
  href?: string;
}
