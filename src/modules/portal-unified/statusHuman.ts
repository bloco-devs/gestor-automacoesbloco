import type { DemandStatus } from "@/modules/demands/types";

export interface HumanStatus {
  label: string;
  tone: "muted" | "info" | "warn" | "success";
  dot: string;
}

/**
 * Traduz status técnicos internos para linguagem humana.
 * Regra da FEATURE 026.2: solicitante nunca vê Sprint/Backlog/Workflow/Kanban.
 */
export function humanizeStatus(status: DemandStatus): HumanStatus {
  switch (status) {
    case "backlog":
      return { label: "Em análise", tone: "muted", dot: "bg-slate-400" };
    case "a_fazer":
      return { label: "Em análise", tone: "info", dot: "bg-sky-500" };
    case "em_desenvolvimento":
      return { label: "Em desenvolvimento", tone: "info", dot: "bg-sky-500" };
    case "em_testes":
      return { label: "Em desenvolvimento", tone: "info", dot: "bg-sky-500" };
    case "homologacao":
      return { label: "Aguardando validação", tone: "warn", dot: "bg-amber-500" };
    case "concluido":
      return { label: "Concluída", tone: "success", dot: "bg-emerald-500" };
    default:
      return { label: "Em andamento", tone: "info", dot: "bg-sky-500" };
  }
}

export type DemandFilter = "todas" | "abertas" | "andamento" | "concluidas";

export function matchesFilter(status: DemandStatus, filter: DemandFilter): boolean {
  if (filter === "todas") return true;
  if (filter === "concluidas") return status === "concluido";
  if (filter === "abertas") return status === "backlog" || status === "a_fazer";
  if (filter === "andamento")
    return status === "em_desenvolvimento" || status === "em_testes" || status === "homologacao";
  return true;
}

export function humanTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "há poucos minutos";
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
