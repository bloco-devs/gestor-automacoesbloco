import { describe, it, expect } from "vitest";
import {
  scoreSpecialty,
  scoreWorkload,
  scoreSpeed,
  scoreHistory,
  scoreComplexityFit,
  scorePriorityFit,
  scoreSlaFit,
} from "../engine/scoring";
import type { Candidate, DemandInput } from "../types";

const base: Candidate = {
  user_id: "u1",
  nome: "João",
  email: null,
  avatar_url: null,
  active_count: 2,
  avg_resolution_h: 6,
  resolved_count: 10,
  type_history: { bug: 6, melhoria: 4 },
  priority_history: { alta: 5, critica: 3, media: 2 },
  complexity_history: { media: 6, dificil: 4 },
};

const demand: DemandInput = {
  type: "bug",
  priority: "alta",
  complexity: "media",
  sla_status: "no_prazo",
};

describe("scoring", () => {
  it("specialty gives high score for matching type", () => {
    expect(scoreSpecialty(demand, base)).toBeGreaterThan(0.8);
  });
  it("specialty neutral for candidate without history", () => {
    const s = scoreSpecialty(demand, { ...base, resolved_count: 0, type_history: {} });
    expect(s).toBe(0.25);
  });
  it("workload 1 for idle, 0 for double-median", () => {
    expect(scoreWorkload({ ...base, active_count: 0 }, 3)).toBe(1);
    expect(scoreWorkload({ ...base, active_count: 6 }, 3)).toBe(0);
    expect(scoreWorkload({ ...base, active_count: 3 }, 3)).toBeCloseTo(0.5);
  });
  it("speed favors fastest and penalizes slowest", () => {
    expect(scoreSpeed({ ...base, avg_resolution_h: 2 }, 2, 10)).toBe(1);
    expect(scoreSpeed({ ...base, avg_resolution_h: 10 }, 2, 10)).toBe(0);
  });
  it("history saturates at 20 resolved", () => {
    expect(scoreHistory({ ...base, resolved_count: 20 })).toBe(1);
    expect(scoreHistory({ ...base, resolved_count: 5 })).toBeCloseTo(0.25);
  });
  it("complexity fit rewards equal or higher complexity handled", () => {
    const s = scoreComplexityFit(demand, base);
    expect(s).toBeGreaterThan(0.5);
  });
  it("priority fit rewards equal or higher priority handled", () => {
    expect(scorePriorityFit(demand, base)).toBeGreaterThan(0.5);
  });
  it("sla urgent amplifies workload signal", () => {
    const relaxed = scoreSlaFit({ ...demand, sla_status: "no_prazo" }, 1);
    const urgent = scoreSlaFit({ ...demand, sla_status: "estourado" }, 1);
    expect(urgent).toBeGreaterThanOrEqual(relaxed);
  });
});
