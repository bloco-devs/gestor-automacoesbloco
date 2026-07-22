/**
 * Insights Engine — heurísticas locais (sem IA remota) que apoiam o gestor.
 * Executa 100% no cliente sobre dados já carregados. Nunca dispara ações;
 * apenas sugere. Reutiliza tipos do módulo `demands`.
 */
import type { Demand, UserWorkload } from "@/modules/demands/types";
import type { OperationsInsight } from "../types";

const HOUR = 60 * 60 * 1000;

interface Options {
  now?: number;
}

export function buildInsights(
  demands: Demand[],
  workloads: UserWorkload[],
  opts: Options = {},
): OperationsInsight[] {
  const now = opts.now ?? Date.now();
  const out: OperationsInsight[] = [];

  const activos = demands.filter((d) => d.status !== "concluido");
  const semResp = activos.filter((d) => !d.assigned_to);
  const estouradas = activos.filter((d) => d.sla_status === "estourado");
  const proximosDoBreach = activos.filter((d) => {
    if (d.sla_status !== "atencao" || !d.sla_due_at) return false;
    const t = new Date(d.sla_due_at).getTime();
    return Number.isFinite(t) && t - now <= 2 * HOUR && t - now > 0;
  });

  if (estouradas.length > 0) {
    out.push({
      id: "sla-estourado",
      severity: "risk",
      title: `${estouradas.length} solicitação(ões) com SLA vencido`,
      detail: "Priorize a resolução imediata para reduzir impacto.",
      action: { label: "Abrir board", href: "/admin/demandas" },
    });
  }
  if (proximosDoBreach.length > 0) {
    out.push({
      id: "sla-proximo",
      severity: "attention",
      title: `${proximosDoBreach.length} SLA(s) podem estourar em até 2h`,
      detail: "Considere realocar atendentes ou escalonar prioridade.",
    });
  }
  if (semResp.length >= 3) {
    out.push({
      id: "sem-responsavel",
      severity: "attention",
      title: `${semResp.length} solicitações sem responsável`,
      detail: "Atribua alguém ou habilite auto-assign para acelerar a triagem.",
    });
  }

  // Sobrecarga: quem tem mais de 2x a mediana
  if (workloads.length >= 2) {
    const sorted = [...workloads].map((w) => w.active_count).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const overloaded = workloads.filter((w) => median > 0 && w.active_count >= median * 2 && w.active_count >= 4);
    for (const o of overloaded) {
      out.push({
        id: `overload-${o.user_id}`,
        severity: "attention",
        title: `${o.nome ?? o.email ?? "Atendente"} está sobrecarregado(a)`,
        detail: `${o.active_count} solicitações ativas (mediana da equipe: ${median}).`,
      });
    }
  }

  // Categorias em crescimento (por tipo)
  const byType = new Map<string, number>();
  for (const d of activos) byType.set(d.type, (byType.get(d.type) ?? 0) + 1);
  const [topType] = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  if (topType && topType[1] >= 5) {
    out.push({
      id: `top-tipo-${topType[0]}`,
      severity: "info",
      title: `Categoria "${topType[0]}" concentra ${topType[1]} solicitações`,
      detail: "Pode indicar problema recorrente. Avalie um artigo na base.",
      action: { label: "Base de conhecimento", href: "/admin/base-conhecimento" },
    });
  }

  return out;
}
