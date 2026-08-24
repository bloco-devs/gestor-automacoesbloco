import { describe, it, expect } from "vitest";
import { formatarPercentual, formatarReais } from "../services/apuracao-data";
import { percentualDeAlcance, resolverFaixa } from "../services/relatorios-service";
import type { Faixa } from "../types";

const META = 800;

const FAIXAS: Faixa[] = [
  { id: "1", rotulo: "Abaixo da meta", percentualMin: 0, percentualMax: 80, valorReais: 0 },
  { id: "2", rotulo: "Meta parcial", percentualMin: 80, percentualMax: 100, valorReais: 800 },
  { id: "3", rotulo: "Meta atingida", percentualMin: 100, percentualMax: 100, valorReais: 1000 },
  { id: "4", rotulo: "Não definida", percentualMin: 100.01, percentualMax: 120, valorReais: null },
  { id: "5", rotulo: "Superação", percentualMin: 120, percentualMax: null, valorReais: 1200 },
];

describe("Relatório Executivo e Apuração — Regras e Formatação", () => {
  it("Relatório sem atividades (0 pontos)", () => {
    const pct = percentualDeAlcance(0, META);
    expect(pct).toBe(0);
    const f = resolverFaixa(pct, FAIXAS);
    expect(f.valorReais).toBe(0);
    expect(formatarReais(f.valorReais)).toContain("0,00");
  });

  it("Colaborador com entregas Fácil (50), Médio (100), Difícil (200)", () => {
    const pontos = 50 + 100 + 200; // 350 pts
    expect(pontos).toBe(350);
    const pct = percentualDeAlcance(pontos, META);
    expect(pct).toBe(43.75);
    expect(formatarPercentual(pct)).toContain("43");
  });

  it("640 pontos atinge 80% e faixa de R$ 800", () => {
    const pct = percentualDeAlcance(640, META);
    expect(pct).toBe(80);
    const f = resolverFaixa(pct, FAIXAS);
    expect(f.faixa?.rotulo).toBe("Meta parcial");
    expect(f.valorReais).toBe(800);
    expect(formatarReais(800)).toContain("800,00");
  });

  it("800 pontos atinge 100% da meta e faixa de R$ 1.000", () => {
    const pct = percentualDeAlcance(800, META);
    expect(pct).toBe(100);
    const f = resolverFaixa(pct, FAIXAS);
    expect(f.faixa?.rotulo).toBe("Meta atingida");
    expect(f.valorReais).toBe(1000);
    expect(f.indefinida).toBe(false);
  });

  it("960 pontos atinge 120% e faixa de superação (R$ 1.200)", () => {
    const pct = percentualDeAlcance(960, META);
    expect(pct).toBe(120);
    const f = resolverFaixa(pct, FAIXAS);
    expect(f.faixa?.rotulo).toBe("Superação");
    expect(f.valorReais).toBe(1200);
  });

  it("Pontuação em lacuna (850 pts = 106.25%) deve marcar faixa indefinida sem assumir R$ 1.000 ou R$ 1.200", () => {
    const pct = percentualDeAlcance(850, META);
    expect(pct).toBe(106.25);
    const f = resolverFaixa(pct, FAIXAS);
    expect(f.indefinida).toBe(true);
    expect(f.valorReais).toBeNull();
  });
});
