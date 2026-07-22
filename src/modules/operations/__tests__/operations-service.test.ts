import { describe, expect, it } from "vitest";
import { buildBuckets, rankCritical, scoreDemand } from "../services/operations-service";
import { buildInsights } from "../services/insights-engine";
import type { Demand } from "@/modules/demands/types";

const base: Demand = {
  id: "d1",
  title: "Teste",
  description: null,
  system_id: null,
  status: "em_desenvolvimento",
  priority: "media",
  type: "melhoria",
  complexity: "media",
  assigned_to: "u1",
  created_by: "u1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  sla_due_at: null,
  sla_first_response_at: null,
  sla_status: "no_prazo",
};

describe("operations-service", () => {
  it("buckets counts open items and daily completions", () => {
    const now = Date.now();
    const demands: Demand[] = [
      { ...base, id: "a", priority: "critica" },
      { ...base, id: "b", assigned_to: null, sla_status: "estourado" },
      { ...base, id: "c", status: "concluido", updated_at: new Date(now).toISOString() },
      { ...base, id: "d", status: "homologacao" },
    ];
    const b = buildBuckets(demands, now);
    expect(b.criticas).toBe(1);
    expect(b.semResponsavel).toBe(1);
    expect(b.slaEstourado).toBe(1);
    expect(b.concluidasHoje).toBe(1);
    expect(b.aguardandoCliente).toBe(1);
  });

  it("scoreDemand penaliza SLA estourado e sem responsável", () => {
    const d = scoreDemand({ ...base, priority: "critica", sla_status: "estourado", assigned_to: null });
    expect(d.reasons).toContain("SLA vencido");
    expect(d.reasons).toContain("Sem responsável");
    expect(d.score).toBeGreaterThan(300);
  });

  it("rankCritical ignora concluídas e ordena por score", () => {
    const items = rankCritical([
      { ...base, id: "1", priority: "baixa" },
      { ...base, id: "2", priority: "critica", sla_status: "estourado" },
      { ...base, id: "3", status: "concluido" },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe("2");
  });

  it("buildInsights sinaliza SLA vencido e sem responsável", () => {
    const demands: Demand[] = [
      { ...base, id: "1", sla_status: "estourado" },
      { ...base, id: "2", assigned_to: null },
      { ...base, id: "3", assigned_to: null },
      { ...base, id: "4", assigned_to: null },
    ];
    const ins = buildInsights(demands, []);
    expect(ins.some((i) => i.id === "sla-estourado")).toBe(true);
    expect(ins.some((i) => i.id === "sem-responsavel")).toBe(true);
  });
});
