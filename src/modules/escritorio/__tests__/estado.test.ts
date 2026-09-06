import { describe, expect, it } from "vitest";
import { culpaDeTerceiro, estadoDoSistema, intervaloEntreViagens } from "../estado";

const AGORA = Date.parse("2026-09-05T20:00:00Z");
const horasAtras = (h: number) => new Date(AGORA - h * 3_600_000).toISOString();

describe("estado do sistema", () => {
  it("sem histórico é ocioso", () => {
    expect(estadoDoSistema(undefined, AGORA)).toBe("ocioso");
    expect(estadoDoSistema({ execs: 0, ok: 0, falhas: 0, ultima: null }, AGORA)).toBe("ocioso");
  });

  it("rodou há pouco e sem falhar é trabalhando", () => {
    expect(estadoDoSistema({ execs: 100, ok: 100, falhas: 0, ultima: horasAtras(2) }, AGORA)).toBe("trabalhando");
  });

  it("parado há mais de um dia é ocioso mesmo tendo rodado no mês", () => {
    expect(estadoDoSistema({ execs: 900, ok: 900, falhas: 0, ultima: horasAtras(40) }, AGORA)).toBe("ocioso");
  });

  it("falha manda mesmo com execução recente", () => {
    expect(estadoDoSistema({ execs: 100, ok: 90, falhas: 10, ultima: horasAtras(1) }, AGORA)).toBe("falha");
  });

  it("logo abaixo do limiar ainda é trabalhando", () => {
    expect(estadoDoSistema({ execs: 1000, ok: 960, falhas: 49, ultima: horasAtras(1) }, AGORA)).toBe("trabalhando");
  });

  it("aponta quando a culpa é do outro lado", () => {
    expect(culpaDeTerceiro({ execs: 100, ok: 80, falhas: 20, falhas_upstream: 18, ultima: null })).toBe(true);
    expect(culpaDeTerceiro({ execs: 100, ok: 80, falhas: 20, falhas_upstream: 2, ultima: null })).toBe(false);
  });
});

describe("frequência de viagens", () => {
  it("quem roda mais anda mais", () => {
    const muito = intervaloEntreViagens(1200, 1200);
    const pouco = intervaloEntreViagens(12, 1200);
    expect(muito).toBeLessThan(pouco);
  });

  it("quem não roda nunca levanta", () => {
    expect(intervaloEntreViagens(0, 1200)).toBe(Infinity);
  });

  it("fica dentro da faixa utilizável", () => {
    for (const e of [1, 10, 100, 1000, 50_000]) {
      const s = intervaloEntreViagens(e, 50_000);
      expect(s).toBeGreaterThanOrEqual(6);
      expect(s).toBeLessThanOrEqual(70);
    }
  });
});
