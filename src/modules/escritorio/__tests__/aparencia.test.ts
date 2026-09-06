import { describe, expect, it } from "vitest";
import { aparenciaDoSistema, hash, tom } from "../aparencia";
import { SISTEMAS_SEED, CONECTORES_EXTERNOS_SEED } from "@/lib/ecossistemaSeed";

describe("aparência procedural", () => {
  it("é estável: o mesmo id devolve sempre a mesma cara", () => {
    const a = aparenciaDoSistema("financeiro");
    const b = aparenciaDoSistema("financeiro");
    expect(a).toEqual(b);
  });

  it("sistemas diferentes não saem todos iguais", () => {
    const caras = new Set(SISTEMAS_SEED.map((s) => JSON.stringify(aparenciaDoSistema(s.id))));
    expect(caras.size).toBeGreaterThan(SISTEMAS_SEED.length / 2);
  });

  it("nunca devolve cor indefinida — o hash não pode virar índice negativo", () => {
    // `h >> 7` em vez de `h >>> 7` produz índice negativo e a paleta some.
    const ids = [
      ...SISTEMAS_SEED.map((s) => s.id),
      ...CONECTORES_EXTERNOS_SEED.map((c) => c.id),
      ...Array.from({ length: 500 }, (_, i) => `sistema-${i}`),
    ];
    for (const id of ids) {
      const a = aparenciaDoSistema(id);
      for (const [campo, valor] of Object.entries(a)) {
        if (campo === "estilo" || campo === "formal") continue;
        expect(valor, `${id}.${campo}`).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(a.estilo).toBeGreaterThanOrEqual(0);
      expect(a.estilo).toBeLessThanOrEqual(2);
    }
  });

  it("hash é sempre positivo", () => {
    for (let i = 0; i < 300; i++) expect(hash(`x${i}`)).toBeGreaterThanOrEqual(0);
  });

  it("tom satura em 255 em vez de estourar o hex", () => {
    expect(tom("#f0f0f0", 2)).toBe("#ffffff");
    expect(tom("#804020", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
