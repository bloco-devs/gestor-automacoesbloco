import { describe, it, expect } from "vitest";
import {
  computeScoreSolicitante,
  computeScoreFinal,
  scoreTone,
} from "@/lib/scoreV2";

describe("computeScoreSolicitante", () => {
  it("0 em todos os fatores → 0", () => {
    expect(computeScoreSolicitante(0, 0, 0)).toBe(0);
  });
  it("10 em todos os fatores → 100", () => {
    expect(computeScoreSolicitante(10, 10, 10)).toBe(100);
  });
  it("(8,7,6) → 70", () => {
    expect(computeScoreSolicitante(8, 7, 6)).toBeCloseTo(70, 10);
  });
  it("faz clamp em valores acima de 10", () => {
    expect(computeScoreSolicitante(20, 20, 20)).toBe(100);
  });
  it("faz clamp em valores negativos", () => {
    expect(computeScoreSolicitante(-5, 10, 10)).toBeCloseTo((20 / 30) * 100, 10);
  });
  it("NaN é tratado como 0", () => {
    expect(computeScoreSolicitante(Number.NaN, 0, 0)).toBe(0);
  });
});

describe("computeScoreFinal", () => {
  it("retorna null quando complexidadeDev é null", () => {
    expect(computeScoreFinal(70, null)).toBeNull();
  });
  it("retorna null quando complexidadeDev é undefined", () => {
    expect(computeScoreFinal(70, undefined as unknown as null)).toBeNull();
  });
  it("(70, 3) → 49", () => {
    expect(computeScoreFinal(70, 3)).toBeCloseTo(49, 10);
  });
  it("complexidade 0 não penaliza", () => {
    expect(computeScoreFinal(80, 0)).toBe(80);
  });
  it("complexidade 10 zera o score", () => {
    expect(computeScoreFinal(80, 10)).toBe(0);
  });
  it("faz clamp da complexidade acima de 10", () => {
    expect(computeScoreFinal(80, 15)).toBe(0);
  });
});

describe("scoreTone", () => {
  it("null → low", () => {
    expect(scoreTone(null, "final")).toBe("low");
  });
  it(">= 75 → high", () => {
    expect(scoreTone(75, "final")).toBe("high");
    expect(scoreTone(99, "solicitante")).toBe("high");
  });
  it(">= 50 e < 75 → mid", () => {
    expect(scoreTone(50, "final")).toBe("mid");
    expect(scoreTone(74, "solicitante")).toBe("mid");
  });
  it("< 50 → low", () => {
    expect(scoreTone(49, "final")).toBe("low");
    expect(scoreTone(0, "solicitante")).toBe("low");
  });
});
