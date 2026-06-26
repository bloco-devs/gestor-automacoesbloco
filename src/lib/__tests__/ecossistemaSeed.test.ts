import { describe, it, expect } from "vitest";
import {
  computeEcossistemaLayout,
  SISTEMAS_SEED,
  CONECTORES_EXTERNOS_SEED,
  INTEGRACOES_SEED,
  INTEGRACOES_HUB_SEED,
} from "@/lib/ecossistemaSeed";

describe("computeEcossistemaLayout", () => {
  const { nodes, edges } = computeEcossistemaLayout();
  const ids = new Set(nodes.map((n) => n.id));

  it("inclui todos os sistemas e conectores como nós", () => {
    expect(nodes.length).toBe(
      SISTEMAS_SEED.length + CONECTORES_EXTERNOS_SEED.length,
    );
    for (const s of SISTEMAS_SEED) expect(ids.has(s.id)).toBe(true);
    for (const c of CONECTORES_EXTERNOS_SEED) expect(ids.has(c.id)).toBe(true);
  });

  it("marca conectores externos com externo=true e sistemas com externo=false", () => {
    for (const s of SISTEMAS_SEED) {
      expect(nodes.find((n) => n.id === s.id)!.externo).toBe(false);
    }
    for (const c of CONECTORES_EXTERNOS_SEED) {
      expect(nodes.find((n) => n.id === c.id)!.externo).toBe(true);
    }
  });

  it("não emite arestas órfãs (source/target sempre existem como nó)", () => {
    for (const e of edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  it("emite uma aresta por integração de seed e por integração com HUB", () => {
    expect(edges.length).toBe(
      INTEGRACOES_SEED.length + INTEGRACOES_HUB_SEED.length,
    );
  });

  it("ids de arestas são únicos", () => {
    const set = new Set(edges.map((e) => e.id));
    expect(set.size).toBe(edges.length);
  });

  it("ids de nós são únicos", () => {
    const set = new Set(nodes.map((n) => n.id));
    expect(set.size).toBe(nodes.length);
  });

  it("coordenadas são numéricas e não-negativas", () => {
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.y).toBeGreaterThanOrEqual(0);
    }
  });
});
