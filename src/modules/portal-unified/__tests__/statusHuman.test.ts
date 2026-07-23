import { describe, expect, it } from "vitest";
import {
  humanizeStatus,
  humanTime,
  matchesFilter,
} from "@/modules/portal-unified/statusHuman";
import type { DemandStatus } from "@/modules/demands/types";

describe("Portal Unificado — humanização de status", () => {
  it("nunca expõe termos técnicos ao solicitante", () => {
    const forbidden = /(sprint|backlog|kanban|workflow|sla|pipeline)/i;
    const all: DemandStatus[] = [
      "backlog",
      "a_fazer",
      "em_desenvolvimento",
      "em_testes",
      "homologacao",
      "concluido",
    ];
    for (const s of all) {
      expect(humanizeStatus(s).label).not.toMatch(forbidden);
    }
  });

  it("mapeia status finais como Concluída", () => {
    expect(humanizeStatus("concluido").label).toBe("Concluída");
  });

  it("mapeia homologação como aguardando validação", () => {
    expect(humanizeStatus("homologacao").label).toBe("Aguardando validação");
  });
});

describe("Portal Unificado — filtros de demandas", () => {
  it("Todas aceita qualquer status", () => {
    expect(matchesFilter("backlog", "todas")).toBe(true);
    expect(matchesFilter("concluido", "todas")).toBe(true);
  });
  it("Concluídas isola apenas concluído", () => {
    expect(matchesFilter("concluido", "concluidas")).toBe(true);
    expect(matchesFilter("em_desenvolvimento", "concluidas")).toBe(false);
  });
  it("Abertas agrupa backlog + a_fazer", () => {
    expect(matchesFilter("backlog", "abertas")).toBe(true);
    expect(matchesFilter("a_fazer", "abertas")).toBe(true);
    expect(matchesFilter("em_desenvolvimento", "abertas")).toBe(false);
  });
  it("Em andamento agrupa dev/testes/homologação", () => {
    expect(matchesFilter("em_desenvolvimento", "andamento")).toBe(true);
    expect(matchesFilter("em_testes", "andamento")).toBe(true);
    expect(matchesFilter("homologacao", "andamento")).toBe(true);
    expect(matchesFilter("concluido", "andamento")).toBe(false);
  });
});

describe("humanTime", () => {
  it("retorna string não vazia", () => {
    expect(humanTime(new Date().toISOString()).length).toBeGreaterThan(0);
  });
});
