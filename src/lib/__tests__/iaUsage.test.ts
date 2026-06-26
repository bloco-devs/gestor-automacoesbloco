import { describe, it, expect } from "vitest";
import {
  aggregateIaUsage,
  periodToSinceIso,
  type IaUsageRow,
} from "@/lib/iaUsage";

function row(partial: Partial<IaUsageRow>): IaUsageRow {
  return {
    acao: null,
    modelo: null,
    tokens_in: 0,
    tokens_out: 0,
    status: null,
    user_id: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe("aggregateIaUsage", () => {
  it("array vazio → tudo zero", () => {
    const a = aggregateIaUsage([]);
    expect(a.totalCalls).toBe(0);
    expect(a.totalTokensIn).toBe(0);
    expect(a.totalTokensOut).toBe(0);
    expect(a.errorRate).toBe(0);
    expect(a.byAcao).toEqual([]);
    expect(a.byModelo).toEqual([]);
    expect(a.byStatus).toEqual([]);
  });

  it("soma totais e tokens", () => {
    const rows = [
      row({ tokens_in: 10, tokens_out: 5, status: "ok" }),
      row({ tokens_in: 20, tokens_out: 7, status: "ok" }),
      row({ tokens_in: 3, tokens_out: 2, status: "erro" }),
    ];
    const a = aggregateIaUsage(rows);
    expect(a.totalCalls).toBe(3);
    expect(a.totalTokensIn).toBe(33);
    expect(a.totalTokensOut).toBe(14);
    expect(a.okCount).toBe(2);
    expect(a.errorCount).toBe(1);
    expect(a.limitCount).toBe(0);
    expect(a.errorRate).toBeCloseTo(1 / 3, 10);
  });

  it("classifica limite/limit/rate_limit corretamente", () => {
    const a = aggregateIaUsage([
      row({ status: "limite" }),
      row({ status: "rate_limit" }),
      row({ status: "ok" }),
    ]);
    expect(a.limitCount).toBe(2);
    expect(a.okCount).toBe(1);
    expect(a.errorRate).toBeCloseTo(2 / 3, 10);
  });

  it("agrupa por ação ordenado por contagem desc", () => {
    const a = aggregateIaUsage([
      row({ acao: "triagem" }),
      row({ acao: "triagem" }),
      row({ acao: "resumo" }),
    ]);
    expect(a.byAcao[0]).toMatchObject({ key: "triagem", count: 2 });
    expect(a.byAcao[1]).toMatchObject({ key: "resumo", count: 1 });
  });

  it("agrupa por modelo e soma tokens por grupo", () => {
    const a = aggregateIaUsage([
      row({ modelo: "gemini", tokens_in: 5, tokens_out: 1 }),
      row({ modelo: "gemini", tokens_in: 7, tokens_out: 2 }),
      row({ modelo: "gpt-5", tokens_in: 3, tokens_out: 4 }),
    ]);
    const gemini = a.byModelo.find((r) => r.key === "gemini")!;
    expect(gemini.count).toBe(2);
    expect(gemini.tokensIn).toBe(12);
    expect(gemini.tokensOut).toBe(3);
  });

  it("usa '—' quando o campo é null", () => {
    const a = aggregateIaUsage([row({ acao: null }), row({ acao: null })]);
    expect(a.byAcao[0]).toMatchObject({ key: "—", count: 2 });
  });
});

describe("periodToSinceIso", () => {
  it("retorna ISO string parseável", () => {
    const iso = periodToSinceIso("7d");
    expect(typeof iso).toBe("string");
    expect(Number.isNaN(Date.parse(iso))).toBe(false);
  });

  it("24h ≈ 24h atrás", () => {
    const ms = Date.now() - Date.parse(periodToSinceIso("24h"));
    expect(ms).toBeGreaterThan(23 * 3600_000);
    expect(ms).toBeLessThan(25 * 3600_000);
  });

  it("7d ≈ 7 dias atrás", () => {
    const ms = Date.now() - Date.parse(periodToSinceIso("7d"));
    expect(ms).toBeGreaterThan(6.9 * 86400_000);
    expect(ms).toBeLessThan(7.1 * 86400_000);
  });

  it("30d ≈ 30 dias atrás", () => {
    const ms = Date.now() - Date.parse(periodToSinceIso("30d"));
    expect(ms).toBeGreaterThan(29.9 * 86400_000);
    expect(ms).toBeLessThan(30.1 * 86400_000);
  });
});
