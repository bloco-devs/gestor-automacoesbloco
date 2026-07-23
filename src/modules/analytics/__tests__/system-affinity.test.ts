import { describe, expect, it } from "vitest";
import type { Candidate, SystemHistoryEntry } from "@/modules/routing/types";
import {
  SYSTEM_AFFINITY_THRESHOLDS,
  buildAffinityMatrix,
  buildCoverage,
  buildDeveloperComparison,
  buildInsights,
  buildSystemRankings,
  detectRisks,
} from "../utils/systemAffinityAnalytics";

function mkEntry(over: Partial<SystemHistoryEntry> & { slug: string }): SystemHistoryEntry {
  return {
    total: 10,
    success: 8,
    avg_resolution_h: 4,
    documentation: 2,
    ...over,
  };
}

function mkDev(over: Partial<Candidate> & { user_id: string }): Candidate {
  return {
    nome: over.user_id,
    email: null,
    avatar_url: null,
    active_count: 2,
    avg_resolution_h: 6,
    resolved_count: 20,
    type_history: {},
    priority_history: {},
    complexity_history: {},
    system_history: [],
    ...over,
  } as Candidate;
}

describe("buildAffinityMatrix", () => {
  it("retorna vazio para pool vazio", () => {
    const m = buildAffinityMatrix([]);
    expect(m.isEmpty).toBe(true);
    expect(m.systems).toEqual([]);
    expect(m.devs).toEqual([]);
    expect(m.cell("x", "y")).toBeNull();
  });

  it("ordena sistemas por total desc e devs por afinidade média desc", () => {
    const pool: Candidate[] = [
      mkDev({
        user_id: "star",
        system_history: [
          mkEntry({ slug: "rh", total: 20, success: 20, avg_resolution_h: 2, documentation: 5 }),
          mkEntry({ slug: "cx", total: 2, success: 1, avg_resolution_h: 20 }),
        ],
      }),
      mkDev({
        user_id: "noob",
        system_history: [mkEntry({ slug: "rh", total: 1, success: 0, avg_resolution_h: 40 })],
      }),
    ];
    const m = buildAffinityMatrix(pool);
    expect(m.systems[0]).toBe("rh"); // rh soma 21 demandas > cx 2
    expect(m.devs[0].user_id).toBe("star");
    expect(m.cell("star", "rh")?.affinity).toBeGreaterThan(50);
    expect(m.cell("noob", "cx")).toBeNull();
    expect(m.maxAffinity).toBeGreaterThan(0);
  });
});

describe("buildSystemRankings", () => {
  it("limita topN e ordena por afinidade desc", () => {
    const pool: Candidate[] = Array.from({ length: 8 }, (_, i) =>
      mkDev({
        user_id: `u${i}`,
        system_history: [
          mkEntry({
            slug: "rh",
            total: 10 + i,
            success: 5 + i,
            avg_resolution_h: 8 - i * 0.5,
          }),
        ],
      }),
    );
    const r = buildSystemRankings(pool, 3);
    const list = r.get("rh")!;
    expect(list).toHaveLength(3);
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].affinity).toBeGreaterThanOrEqual(list[i].affinity);
    }
  });

  it("marca especialistas com afinidade ≥ threshold", () => {
    const pool = [
      mkDev({
        user_id: "hero",
        system_history: [
          mkEntry({ slug: "rh", total: 50, success: 50, avg_resolution_h: 1, documentation: 10 }),
        ],
      }),
    ];
    const r = buildSystemRankings(pool);
    expect(r.get("rh")![0].isSpecialist).toBe(true);
  });

  it("desempata por total, depois nome", () => {
    const pool = [
      mkDev({
        user_id: "b",
        nome: "Bruno",
        system_history: [mkEntry({ slug: "rh", total: 5, success: 5, avg_resolution_h: 4 })],
      }),
      mkDev({
        user_id: "a",
        nome: "Ana",
        system_history: [mkEntry({ slug: "rh", total: 5, success: 5, avg_resolution_h: 4 })],
      }),
    ];
    const r = buildSystemRankings(pool);
    expect(r.get("rh")![0].candidate.nome).toBe("Ana");
  });
});

describe("buildCoverage", () => {
  it("classifica sistemas em zero/one/twoPlus", () => {
    const strongEntry = { total: 20, success: 20, avg_resolution_h: 1, documentation: 10 };
    const weakEntry = { total: 1, success: 0, avg_resolution_h: 48 };
    const pool: Candidate[] = [
      mkDev({
        user_id: "a",
        system_history: [
          mkEntry({ slug: "rh", ...strongEntry }),
          mkEntry({ slug: "cx", ...weakEntry }),
          mkEntry({ slug: "fin", ...strongEntry }),
        ],
      }),
      mkDev({
        user_id: "b",
        system_history: [
          mkEntry({ slug: "fin", ...strongEntry }),
          mkEntry({ slug: "cx", ...weakEntry }),
        ],
      }),
    ];
    const cov = buildCoverage(pool);
    expect(cov.zero).toContain("cx");
    expect(cov.one).toContain("rh");
    expect(cov.twoPlus).toContain("fin");
    expect(cov.totalSystems).toBe(3);
    expect(cov.pctCovered).toBeGreaterThan(50);
  });

  it("retorna cobertura zero quando pool vazio", () => {
    const cov = buildCoverage([]);
    expect(cov.totalSystems).toBe(0);
    expect(cov.pctCovered).toBe(0);
  });
});

describe("detectRisks", () => {
  it("marca alta quando não há especialista", () => {
    const pool = [
      mkDev({
        user_id: "u1",
        system_history: [mkEntry({ slug: "cx", total: 2, success: 0, avg_resolution_h: 40 })],
      }),
    ];
    const risks = detectRisks(pool);
    const cx = risks.find((r) => r.slug === "cx")!;
    expect(cx.severity).toBe("alta");
    expect(cx.reasons.join(" ")).toMatch(/especialista/i);
  });

  it("marca ponto único de falha quando um especialista", () => {
    const pool = [
      mkDev({
        user_id: "u1",
        system_history: [
          mkEntry({
            slug: "fin",
            total: 30,
            success: 30,
            avg_resolution_h: 1,
            documentation: 10,
          }),
        ],
      }),
    ];
    const r = detectRisks(pool).find((x) => x.slug === "fin")!;
    expect(["media", "alta"]).toContain(r.severity);
    expect(r.soleSpecialist?.user_id).toBe("u1");
  });

  it("marca alta quando único especialista está sem carga", () => {
    const pool = [
      mkDev({
        user_id: "u1",
        active_count: 0,
        system_history: [
          mkEntry({
            slug: "portal",
            total: 30,
            success: 30,
            avg_resolution_h: 1,
            documentation: 10,
          }),
        ],
      }),
    ];
    const r = detectRisks(pool).find((x) => x.slug === "portal")!;
    expect(r.severity).toBe("alta");
    expect(r.reasons.join(" ")).toMatch(/sem carga/i);
  });

  it("marca sem documentação como média", () => {
    const pool = [
      mkDev({
        user_id: "a",
        system_history: [
          mkEntry({
            slug: "crm",
            total: 20,
            success: 20,
            avg_resolution_h: 2,
            documentation: 0,
          }),
        ],
      }),
      mkDev({
        user_id: "b",
        system_history: [
          mkEntry({
            slug: "crm",
            total: 20,
            success: 20,
            avg_resolution_h: 2,
            documentation: 0,
          }),
        ],
      }),
    ];
    const r = detectRisks(pool).find((x) => x.slug === "crm")!;
    expect(r.reasons.join(" ")).toMatch(/documentaç/i);
    expect(r.severity).toBe("media");
  });

  it("não emite risco quando sistema é saudável", () => {
    const strong = { total: 20, success: 20, avg_resolution_h: 1, documentation: 5 };
    const pool: Candidate[] = ["a", "b", "c"].map((id) =>
      mkDev({
        user_id: id,
        system_history: [mkEntry({ slug: "rh", ...strong })],
      }),
    );
    const risks = detectRisks(pool);
    expect(risks.find((r) => r.slug === "rh")).toBeUndefined();
  });
});

describe("buildInsights", () => {
  it("gera texto para ponto único", () => {
    const pool = [
      mkDev({
        user_id: "hero",
        system_history: [
          mkEntry({
            slug: "financeiro",
            total: 30,
            success: 30,
            avg_resolution_h: 1,
            documentation: 5,
          }),
        ],
      }),
    ];
    const insights = buildInsights(pool);
    expect(insights.some((i) => /apenas um desenvolvedor/i.test(i.text))).toBe(true);
  });

  it("gera texto para baixa taxa de sucesso", () => {
    const pool = [
      mkDev({
        user_id: "u1",
        system_history: [
          mkEntry({ slug: "portal", total: 10, success: 3, avg_resolution_h: 8, documentation: 2 }),
        ],
      }),
    ];
    const insights = buildInsights(pool);
    expect(insights.some((i) => /baixa taxa de sucesso/i.test(i.text))).toBe(true);
  });

  it("gera texto positivo quando sistema tem 3+ especialistas", () => {
    const strong = { total: 20, success: 20, avg_resolution_h: 1, documentation: 5 };
    const pool = ["a", "b", "c"].map((id) =>
      mkDev({ user_id: id, system_history: [mkEntry({ slug: "rh", ...strong })] }),
    );
    const insights = buildInsights(pool);
    expect(insights.some((i) => i.slug === "rh" && i.tone === "success")).toBe(true);
  });

  it("retorna vazio para pool vazio", () => {
    expect(buildInsights([])).toEqual([]);
  });
});

describe("buildDeveloperComparison", () => {
  const pool: Candidate[] = [
    mkDev({
      user_id: "me",
      nome: "Eu",
      system_history: [
        mkEntry({
          slug: "rh",
          total: 15,
          success: 14,
          avg_resolution_h: 2,
          documentation: 3,
        }),
      ],
    }),
    mkDev({
      user_id: "other",
      nome: "Outro",
      system_history: [
        mkEntry({ slug: "rh", total: 5, success: 3, avg_resolution_h: 8, documentation: 0 }),
      ],
    }),
  ];

  it("retorna comparativo com posição de ranking e diff", () => {
    const c = buildDeveloperComparison(pool, "me");
    expect(c.isEmpty).toBe(false);
    expect(c.mySystems[0].rankPosition).toBe(1);
    expect(c.mySystems[0].rankTotal).toBe(2);
    expect(c.mySystems[0].diff).toBeGreaterThan(0);
    expect(c.myAvgAffinity).toBeGreaterThan(0);
    expect(c.teamAvgAffinity).toBeGreaterThan(0);
  });

  it("fallback vazio para userId inexistente", () => {
    const c = buildDeveloperComparison(pool, "ghost");
    expect(c.isEmpty).toBe(true);
    expect(c.me).toBeNull();
    expect(c.mySystems).toEqual([]);
  });

  it("fallback vazio para userId undefined", () => {
    const c = buildDeveloperComparison(pool, undefined);
    expect(c.isEmpty).toBe(true);
  });

  it("acumula total de artigos", () => {
    const c = buildDeveloperComparison(pool, "me");
    expect(c.totalDocs).toBe(3);
  });
});

describe("threshold constants", () => {
  it("expõe SPECIALIST e LOW", () => {
    expect(SYSTEM_AFFINITY_THRESHOLDS.SPECIALIST).toBe(60);
    expect(SYSTEM_AFFINITY_THRESHOLDS.LOW).toBe(30);
  });
});
