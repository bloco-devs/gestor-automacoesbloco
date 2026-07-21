import { describe, it, expect, vi } from "vitest";
import { createContextEngine } from "../context-engine";
import { createEventBus } from "../context-events";
import { buildFromRoute, buildCardContext } from "../context-builder";
import { selectAIContext, selectModule } from "../context-selectors";

describe("buildFromRoute", () => {
  it("mapeia dashboard developer", () => {
    const r = buildFromRoute("/dashboard");
    expect(r.module).toBe("dashboard");
    expect(r.workspace).toBe("developer");
  });
  it("mapeia dashboard solicitante", () => {
    expect(buildFromRoute("/dashboard-solicitante").workspace).toBe("requester");
  });
  it("detecta board de atividades por id", () => {
    const r = buildFromRoute("/atividades/abc12345");
    expect(r.module).toBe("atividades");
    expect(r.entityType).toBe("board");
    expect(r.entityId).toBe("abc12345");
  });
  it("kanban via /solicitacoes/kanban", () => {
    expect(buildFromRoute("/solicitacoes/kanban").module).toBe("kanban");
  });
  it("nova-solicitacao é ai-workspace", () => {
    expect(buildFromRoute("/nova-solicitacao").module).toBe("ai-workspace");
  });
  it("rota desconhecida = unknown", () => {
    expect(buildFromRoute("/xyz-nao-existe").module).toBe("unknown");
  });
});

describe("context-engine", () => {
  it("setRoute atualiza módulo e emite eventos", () => {
    const eng = createContextEngine();
    const routeSpy = vi.fn();
    const modSpy = vi.fn();
    eng.events.on("ROUTE_CHANGED", routeSpy);
    eng.events.on("MODULE_CHANGED", modSpy);

    eng.setRoute("/dashboard");
    expect(eng.get().module).toBe("dashboard");
    expect(routeSpy).toHaveBeenCalledTimes(1);
    expect(modSpy).toHaveBeenCalledTimes(1);

    // mesma rota — não re-emite
    eng.setRoute("/dashboard");
    expect(routeSpy).toHaveBeenCalledTimes(1);
  });

  it("selectCard emite CARD_SELECTED + ENTITY_SELECTED", () => {
    const eng = createContextEngine();
    const card = vi.fn();
    const ent = vi.fn();
    eng.events.on("CARD_SELECTED", card);
    eng.events.on("ENTITY_SELECTED", ent);
    eng.selectCard("card-1");
    expect(eng.get().entityType).toBe("card");
    expect(eng.get().entityId).toBe("card-1");
    expect(card).toHaveBeenCalledWith({ cardId: "card-1" });
    expect(ent).toHaveBeenCalled();
  });

  it("setFilter mescla filtros e emite FILTER_CHANGED", () => {
    const eng = createContextEngine();
    const spy = vi.fn();
    eng.events.on("FILTER_CHANGED", spy);
    eng.setFilter("status", "aberto");
    eng.setFilter("prioridade", "alta");
    expect(eng.get().filters).toEqual({ status: "aberto", prioridade: "alta" });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("subscribe é notificado a cada commit", () => {
    const eng = createContextEngine();
    const l = vi.fn();
    const off = eng.subscribe(l);
    eng.patch({ metadata: { x: 1 } });
    eng.patch({ metadata: { x: 2 } });
    expect(l).toHaveBeenCalledTimes(2);
    off();
    eng.patch({ metadata: { x: 3 } });
    expect(l).toHaveBeenCalledTimes(2);
  });
});

describe("event bus", () => {
  it("listener defeituoso não trava os demais", () => {
    const bus = createEventBus();
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = vi.fn();
    bus.on("MODULE_CHANGED", () => {
      throw new Error("boom");
    });
    bus.on("MODULE_CHANGED", good);
    bus.emit("MODULE_CHANGED", { previous: "unknown", current: "dashboard" });
    expect(good).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});

describe("selectors + builders", () => {
  it("selectAIContext produz snapshot compacto", () => {
    const eng = createContextEngine();
    eng.setRoute("/atividades/board-1");
    eng.setCurrentUser({ id: "u1", role: "developer" });
    const snap = selectAIContext(eng.get());
    expect(snap.module).toBe("atividades");
    expect(snap.entityType).toBe("board");
    expect(snap.userRole).toBe("developer");
  });
  it("buildCardContext gera patch", () => {
    expect(buildCardContext("42")).toEqual({ entityType: "card", entityId: "42" });
  });
  it("selectModule funciona sobre estado", () => {
    const eng = createContextEngine();
    eng.setRoute("/kanban");
    expect(selectModule(eng.get())).toBe("kanban");
  });
});
