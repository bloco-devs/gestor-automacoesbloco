import { describe, expect, it } from "vitest";
import {
  SYSTEM_FIT_MAX_BONUS,
  findSystemEntry,
  scoreSystemFit,
  scoreSystemFitBreakdown,
  systemAffinityPercent,
} from "../engine/system-fit";
import { rankCandidates } from "../engine/ranker";
import type { Candidate, DemandInput, SystemHistoryEntry } from "../types";

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
  };
}

const baseDemand: DemandInput = {
  type: "bug",
  priority: "alta",
  complexity: "media",
  sla_status: "no_prazo",
};

describe("scoreSystemFit (F018.4)", () => {
  it("retorna 0 quando demand.system_slug ausente", () => {
    const c = mkCand({
      user_id: "u1",
      system_history: [{ slug: "rh", total: 20, success: 19, avg_resolution_h: 3 }],
    });
    expect(scoreSystemFit(baseDemand, c)).toBe(0);
  });

  it("retorna 0 quando candidato não tem histórico no sistema alvo", () => {
    const c = mkCand({
      user_id: "u1",
      system_history: [{ slug: "financeiro", total: 5, success: 5, avg_resolution_h: 2 }],
    });
    expect(scoreSystemFit({ ...baseDemand, system_slug: "rh" }, c)).toBe(0);
  });

  it("bônus fica em 0..MAX", () => {
    const c = mkCand({
      user_id: "u1",
      system_history: [
        { slug: "rh", total: 50, success: 50, avg_resolution_h: 1, documentation: 20 },
      ],
    });
    const bonus = scoreSystemFit({ ...baseDemand, system_slug: "rh" }, c);
    expect(bonus).toBeGreaterThan(SYSTEM_FIT_MAX_BONUS - 0.5);
    expect(bonus).toBeLessThanOrEqual(SYSTEM_FIT_MAX_BONUS);
  });

  it("componentes: quantidade, sucesso, velocidade, documentação", () => {
    const entry: SystemHistoryEntry = {
      slug: "rh",
      total: 10,
      success: 8,
      avg_resolution_h: 4,
      documentation: 5,
    };
    const b = scoreSystemFitBreakdown(entry);
    expect(b.quantity).toBe(1);
    expect(b.success).toBeCloseTo(0.8);
    expect(b.speed).toBe(1);
    expect(b.documentation).toBe(1);
    expect(b.bonus).toBeGreaterThan(0);
  });

  it("findSystemEntry localiza pelo slug", () => {
    const c = mkCand({
      user_id: "u1",
      system_history: [
        { slug: "rh", total: 1, success: 1, avg_resolution_h: 1 },
        { slug: "financeiro", total: 3, success: 2, avg_resolution_h: 5 },
      ],
    });
    expect(findSystemEntry({ system_slug: "financeiro" }, c)?.total).toBe(3);
    expect(findSystemEntry({ system_slug: "obra" }, c)).toBeNull();
  });

  it("systemAffinityPercent devolve 0..100", () => {
    const entry: SystemHistoryEntry = {
      slug: "rh",
      total: 10,
      success: 10,
      avg_resolution_h: 3,
      documentation: 5,
    };
    const pct = systemAffinityPercent(entry);
    expect(pct).toBeGreaterThan(80);
    expect(pct).toBeLessThanOrEqual(100);
  });
});

describe("ranker com afinidade de sistema", () => {
  it("sem system_slug → ordenação idêntica ao base", () => {
    const pool: Candidate[] = [
      mkCand({ user_id: "a", resolved_count: 3, type_history: { bug: 1 } }),
      mkCand({
        user_id: "b",
        resolved_count: 10,
        type_history: { bug: 8 },
        active_count: 1,
        avg_resolution_h: 4,
      }),
    ];
    const r = rankCandidates(baseDemand, pool);
    expect(r.top?.candidate.user_id).toBe("b");
  });

  it("com system_slug: candidato com histórico no sistema recebe bônus somado", () => {
    const generic = mkCand({
      user_id: "generic",
      resolved_count: 10,
      type_history: { bug: 8 },
      active_count: 2,
      avg_resolution_h: 4,
    });
    const specialist = mkCand({
      user_id: "specialist",
      resolved_count: 10,
      type_history: { bug: 8 },
      active_count: 2,
      avg_resolution_h: 4,
      system_history: [
        { slug: "rh", total: 20, success: 19, avg_resolution_h: 2, documentation: 8 },
      ],
    });
    const rNoSys = rankCandidates(baseDemand, [generic, specialist]);
    const rWithSys = rankCandidates({ ...baseDemand, system_slug: "rh" }, [generic, specialist]);
    // sem sistema empatam (dados idênticos), com sistema o especialista sobe
    expect(rWithSys.top?.candidate.user_id).toBe("specialist");
    // score do especialista aumentou; do genérico não
    const specNoSys = rNoSys.all.find((x) => x.candidate.user_id === "specialist")!.score;
    const specWithSys = rWithSys.all.find((x) => x.candidate.user_id === "specialist")!.score;
    const genNoSys = rNoSys.all.find((x) => x.candidate.user_id === "generic")!.score;
    const genWithSys = rWithSys.all.find((x) => x.candidate.user_id === "generic")!.score;
    expect(specWithSys).toBeGreaterThan(specNoSys);
    expect(genWithSys).toBe(genNoSys);
  });

  it("breakdown expõe systemFit e reasons cita o especialista", () => {
    const specialist = mkCand({
      user_id: "specialist",
      system_history: [
        { slug: "rh", total: 24, success: 23, avg_resolution_h: 3, documentation: 18 },
      ],
    });
    const r = rankCandidates({ ...baseDemand, system_slug: "rh" }, [specialist]);
    expect(r.top?.breakdown.systemFit).toBeGreaterThan(0);
    expect(r.top?.reasons.some((s) => /Especialista.*sistema|24 demanda/i.test(s))).toBe(true);
  });
});
