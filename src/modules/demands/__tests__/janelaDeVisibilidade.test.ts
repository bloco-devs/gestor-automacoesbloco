import { describe, it, expect } from "vitest";
import { diasUteisEntre, visivelParaOSolicitante } from "../janelaDeVisibilidade";
import type { Demand } from "../types";

function demanda(status: string, updated_at: string): Demand {
  return { id: "d1", status, updated_at } as unknown as Demand;
}

describe("diasUteisEntre", () => {
  it("pula sábado e domingo", () => {
    // sexta 31/07/2026 → sexta 07/08/2026: 7 dias corridos, 5 úteis.
    expect(diasUteisEntre(new Date("2026-07-31T12:00:00"), new Date("2026-08-07T12:00:00"))).toBe(5);
  });

  it("um fim de semana inteiro não conta nada", () => {
    // sábado → domingo
    expect(diasUteisEntre(new Date("2026-08-01T12:00:00"), new Date("2026-08-02T12:00:00"))).toBe(0);
  });

  it("não devolve número negativo quando a data é futura", () => {
    expect(diasUteisEntre(new Date("2026-08-10T12:00:00"), new Date("2026-08-01T12:00:00"))).toBe(0);
  });
});

describe("visivelParaOSolicitante", () => {
  it("demanda aberta fica, por mais antiga que seja", () => {
    expect(visivelParaOSolicitante(demanda("em_analise", "2020-01-01T10:00:00Z"))).toBe(true);
  });

  it("concluída hoje continua visível — é quando a pessoa quer conferir", () => {
    const agora = new Date("2026-07-31T15:00:00");
    expect(visivelParaOSolicitante(demanda("concluido", "2026-07-31T09:00:00"), agora)).toBe(true);
  });

  it("concluída há 4 dias úteis ainda está dentro da janela", () => {
    // concluída sexta 24/07, olhando quinta 30/07 = 4 dias úteis
    const agora = new Date("2026-07-30T12:00:00");
    expect(visivelParaOSolicitante(demanda("concluido", "2026-07-24T12:00:00"), agora)).toBe(true);
  });

  it("concluída há 5 dias úteis sai da lista", () => {
    // concluída sexta 24/07, olhando sexta 31/07 = 5 dias úteis
    const agora = new Date("2026-07-31T12:00:00");
    expect(visivelParaOSolicitante(demanda("concluido", "2026-07-24T12:00:00"), agora)).toBe(false);
  });

  it("o fim de semana não consome a janela", () => {
    // Concluída na sexta à tarde. Na segunda seguinte passou 1 dia útil, não 3.
    // Com dias corridos, quem conclui na sexta perderia dois dias de vitrine.
    const sexta = "2026-07-24T17:00:00";
    const segunda = new Date("2026-07-27T09:00:00");
    expect(visivelParaOSolicitante(demanda("concluido", sexta), segunda)).toBe(true);
    expect(diasUteisEntre(new Date(sexta), segunda)).toBe(1);
  });

  it("data inválida não some com a demanda", () => {
    // Some por erro de dado é o pior desfecho: a pessoa acha que perdeu o pedido.
    expect(visivelParaOSolicitante(demanda("concluido", "não é data"))).toBe(true);
  });
});
