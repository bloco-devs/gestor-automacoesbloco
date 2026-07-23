import { describe, it, expect } from "vitest";
import { rankCandidates } from "../engine/ranker";
import type { Candidate, DemandInput } from "../types";

function mkCand(over: Partial<Candidate> & { user_id: string }): Candidate {
  return {
    nome: over.user_id,
    email: null,
    avatar_url: null,
    active_count: 2,
    avg_resolution_h: 8,
    resolved_count: 5,
    type_history: {},
    priority_history: {},
    complexity_history: {},
    system_history: [],
    ...over,
  } as Candidate;
}

const demand: DemandInput = {
  type: "bug",
  priority: "alta",
  complexity: "media",
  sla_status: "no_prazo",
};

describe("rankCandidates", () => {
  it("empty pool returns empty ranking", () => {
    const r = rankCandidates(demand, []);
    expect(r.empty).toBe(true);
    expect(r.top).toBeNull();
  });

  it("prefers specialist with low workload", () => {
    const pool: Candidate[] = [
      mkCand({ user_id: "specialist", type_history: { bug: 8 }, resolved_count: 10, active_count: 1, avg_resolution_h: 4 }),
      mkCand({ user_id: "generic", active_count: 5, avg_resolution_h: 12 }),
    ];
    const r = rankCandidates(demand, pool);
    expect(r.top?.candidate.user_id).toBe("specialist");
    expect(r.top?.score).toBeGreaterThan(r.all[1].score);
  });

  it("tie-breaks by workload then affinity then speed then id", () => {
    const pool: Candidate[] = [
      mkCand({ user_id: "b", active_count: 3, avg_resolution_h: 5 }),
      mkCand({ user_id: "a", active_count: 3, avg_resolution_h: 5 }),
    ];
    const r = rankCandidates(demand, pool);
    // com dados idênticos, id "a" < "b" desempata
    expect(r.top?.candidate.user_id).toBe("a");
  });

  it("respects `eligible` filter but falls back if all filtered", () => {
    const pool: Candidate[] = [mkCand({ user_id: "x" })];
    const r = rankCandidates(demand, pool, { eligible: () => false });
    expect(r.top?.candidate.user_id).toBe("x"); // fallback
  });

  it("confidence high requires score>=80 and gap>=5", () => {
    const pool: Candidate[] = [
      mkCand({
        user_id: "star",
        type_history: { bug: 20 },
        resolved_count: 20,
        active_count: 0,
        avg_resolution_h: 1,
        priority_history: { alta: 10, critica: 5 },
        complexity_history: { media: 10, dificil: 5 },
      }),
      mkCand({ user_id: "novice", active_count: 8, avg_resolution_h: 48 }),
    ];
    const r = rankCandidates(demand, pool);
    expect(r.top?.confidence).toBe("high");
  });

  it("custom weights alter ordering", () => {
    const pool: Candidate[] = [
      mkCand({ user_id: "fast", active_count: 6, avg_resolution_h: 1, resolved_count: 2 }),
      mkCand({ user_id: "specialist", type_history: { bug: 5 }, resolved_count: 6, active_count: 4, avg_resolution_h: 10 }),
    ];
    const rDefault = rankCandidates(demand, pool);
    const rSpeed = rankCandidates(demand, pool, {
      weights: { specialty: 0, workload: 0, speed: 100, history: 0, complexity: 0, priority: 0, sla: 0 },
    });
    expect(rSpeed.top?.candidate.user_id).toBe("fast");
    expect(rDefault.top?.candidate.user_id).toBe("specialist");
  });

  it("limits alternatives", () => {
    const pool: Candidate[] = Array.from({ length: 6 }, (_, i) => mkCand({ user_id: `u${i}` }));
    const r = rankCandidates(demand, pool, { maxAlternatives: 2 });
    expect(r.alternatives).toHaveLength(2);
    expect(r.all).toHaveLength(6);
  });
});
