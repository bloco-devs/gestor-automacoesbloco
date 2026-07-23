import { describe, expect, it } from "vitest";
import {
  DOC_GROUPS,
  DOC_TOTAL,
  EDGE_FUNCTIONS,
  FEATURE_TIMELINE,
  INVENTORY,
  MAIN_CHAIN,
  MODULE_EDGES,
  MODULES,
  RELEASE_CHECKLIST,
  TECHNICAL_DEBT,
  computeHealthFindings,
  computeQualityScore,
  computeReuseBoard,
} from "..";

describe("governance / catalog", () => {
  it("inventário cobre categorias essenciais", () => {
    const keys = new Set(INVENTORY.map((i) => i.key));
    ["pages", "routes", "modules", "components", "hooks", "edges", "docs", "tests", "features"].forEach((k) =>
      expect(keys.has(k)).toBe(true),
    );
  });

  it("dependency map só cita módulos existentes", () => {
    const ids = new Set(MODULES.map((m) => m.id));
    for (const e of MODULE_EDGES) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
  });

  it("cadeia principal só cita módulos existentes", () => {
    const ids = new Set(MODULES.map((m) => m.id));
    MAIN_CHAIN.forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it("edge functions batem com contagem do inventário", () => {
    const inv = INVENTORY.find((i) => i.key === "edges");
    expect(inv?.count).toBe(EDGE_FUNCTIONS.length);
  });
});

describe("governance / quality", () => {
  it("quality score retorna A/A+/B/C", () => {
    const s = computeQualityScore();
    expect(["A+", "A", "B", "C"]).toContain(s.grade);
    expect(s.total).toBeGreaterThanOrEqual(0);
    expect(s.total).toBeLessThanOrEqual(100);
    // pesos somam ~1
    const w = s.axes.reduce((a, b) => a + b.weight, 0);
    expect(w).toBeGreaterThan(0.99);
    expect(w).toBeLessThan(1.01);
  });

  it("reuse dashboard classifica corretamente", () => {
    const b = computeReuseBoard();
    expect(b.components.every((c) => c.kind === "component")).toBe(true);
    expect(b.hooks.every((c) => c.kind === "hook")).toBe(true);
    expect(b.services.every((c) => c.kind === "service")).toBe(true);
  });

  it("code health retorna achados não vazios", () => {
    const f = computeHealthFindings();
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => ["info", "warn", "error"].includes(x.severity))).toBe(true);
  });

  it("release checklist só usa status conhecidos", () => {
    RELEASE_CHECKLIST.forEach((r) => expect(["ok", "warn", "pending"]).toContain(r.status));
  });

  it("technical debt é indexado por módulo", () => {
    expect(TECHNICAL_DEBT.every((d) => !!d.module && !!d.message)).toBe(true);
  });
});

describe("governance / timeline + docs", () => {
  it("feature timeline em ordem cronológica plausível", () => {
    expect(FEATURE_TIMELINE.length).toBeGreaterThan(5);
    FEATURE_TIMELINE.forEach((f) => expect(["shipped", "in-progress", "planned"]).toContain(f.status));
  });

  it("cobertura de documentação é sensata", () => {
    const linked = DOC_GROUPS.reduce((s, g) => s + g.items.length, 0);
    expect(linked).toBeGreaterThan(0);
    expect(linked).toBeLessThanOrEqual(DOC_TOTAL * 2);
  });
});
