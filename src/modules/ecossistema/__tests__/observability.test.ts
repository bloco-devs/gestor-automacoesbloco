import { afterEach, describe, expect, it } from "vitest";
import { logEcossistemaEvent, readEcossistemaEvents, readLastEcossistemaEvent } from "../utils/observability";

describe("ecossistema/observability", () => {
  afterEach(() => {
    window.localStorage.removeItem("ecossistema.observability.v1");
  });

  it("registra eventos e devolve o último por tipo", () => {
    logEcossistemaEvent("ecossistema.updated", { reason: "test.a" });
    logEcossistemaEvent("ecossistema.reprocessed", { processadas: 3 });
    logEcossistemaEvent("ecossistema.updated", { reason: "test.b" });

    const all = readEcossistemaEvents();
    expect(all.length).toBe(3);

    const last = readLastEcossistemaEvent("ecossistema.updated");
    expect(last?.payload?.reason).toBe("test.b");

    const reproc = readLastEcossistemaEvent("ecossistema.reprocessed");
    expect(reproc?.payload?.processadas).toBe(3);
  });

  it("limita o ring buffer a 50 eventos", () => {
    for (let i = 0; i < 60; i += 1) {
      logEcossistemaEvent("ecossistema.updated", { i });
    }
    const all = readEcossistemaEvents();
    expect(all.length).toBeLessThanOrEqual(50);
    expect((all[all.length - 1].payload as { i: number }).i).toBe(59);
  });
});
