import { describe, it, expect } from "vitest";
import { rankCandidates } from "../engine/ranker";
import type { Candidate, DemandInput } from "../types";

const demand: DemandInput = {
  type: "bug",
  priority: "alta",
  complexity: "media",
  sla_status: "atencao",
};

describe("fallback behavior", () => {
  it("no candidates -> empty", () => {
    expect(rankCandidates(demand, []).empty).toBe(true);
  });
  it("single candidate becomes top with low confidence when weak", () => {
    const pool: Candidate[] = [
      {
        user_id: "u1",
        nome: null,
        email: null,
        avatar_url: null,
        active_count: 10,
        avg_resolution_h: null,
        resolved_count: 0,
        type_history: {},
        priority_history: {},
        complexity_history: {},
        system_history: [],
      },
    ];
    const r = rankCandidates(demand, pool);
    expect(r.top?.candidate.user_id).toBe("u1");
    expect(r.top?.confidence).toBe("low");
    expect(r.alternatives).toHaveLength(0);
  });
});
