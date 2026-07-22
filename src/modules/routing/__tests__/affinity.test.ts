import { describe, it, expect } from "vitest";
import { deriveHistory } from "../engine/affinity";
import type { Demand } from "@/modules/demands/types";

const base = {
  status: "concluido" as const,
  description: null,
  system_id: null,
  created_by: "x",
  deleted_at: null,
  sla_due_at: null,
  sla_first_response_at: null,
  sla_status: "cumprido" as const,
};

function mkDemand(o: Partial<Demand> & Pick<Demand, "id" | "assigned_to" | "type" | "priority" | "complexity" | "created_at" | "updated_at">): Demand {
  return { ...(base as unknown as Demand), ...o } as Demand;
}

describe("deriveHistory", () => {
  it("returns zeros for unknown user", () => {
    const h = deriveHistory("nobody", []);
    expect(h.resolved_count).toBe(0);
    expect(h.avg_resolution_h).toBeNull();
  });
  it("aggregates counts per type/priority/complexity", () => {
    const dems = [
      mkDemand({
        id: "1",
        assigned_to: "u1",
        type: "bug",
        priority: "alta",
        complexity: "media",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T04:00:00Z",
      }),
      mkDemand({
        id: "2",
        assigned_to: "u1",
        type: "bug",
        priority: "critica",
        complexity: "dificil",
        created_at: "2026-01-02T00:00:00Z",
        updated_at: "2026-01-02T02:00:00Z",
      }),
      mkDemand({
        id: "3",
        assigned_to: "u2",
        type: "melhoria",
        priority: "baixa",
        complexity: "facil",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T01:00:00Z",
      }),
    ];
    const h = deriveHistory("u1", dems);
    expect(h.resolved_count).toBe(2);
    expect(h.type_history.bug).toBe(2);
    expect(h.priority_history.alta).toBe(1);
    expect(h.complexity_history.dificil).toBe(1);
    expect(h.avg_resolution_h).toBeCloseTo(3);
  });
});
