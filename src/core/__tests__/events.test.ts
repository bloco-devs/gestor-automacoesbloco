import { describe, it, expect } from "vitest";
import { createDomainEventBus } from "@/core/events";

describe("core/events/bus", () => {
  it("entrega eventos ao listener certo", () => {
    const bus = createDomainEventBus();
    const received: string[] = [];
    bus.on("card.created", (e) => received.push(e.payload.cardId));
    bus.emit("card.created", { cardId: "c1", boardId: "b1", columnId: "col1", titulo: "T" });
    bus.emit("card.moved", { cardId: "c1", boardId: "b1", fromColumnId: "a", toColumnId: "b", toIndex: 0 });
    expect(received).toEqual(["c1"]);
  });

  it("onAny recebe todos os eventos", () => {
    const bus = createDomainEventBus();
    const names: string[] = [];
    bus.onAny((e) => names.push(e.name));
    bus.emit("card.created", { cardId: "c1", boardId: "b1", columnId: "col1", titulo: "T" });
    bus.emit("card.deleted", { cardId: "c1", boardId: "b1" });
    expect(names).toEqual(["card.created", "card.deleted"]);
  });

  it("unsubscribe funciona", () => {
    const bus = createDomainEventBus();
    let n = 0;
    const off = bus.on("card.created", () => n++);
    bus.emit("card.created", { cardId: "c", boardId: "b", columnId: "col", titulo: "T" });
    off();
    bus.emit("card.created", { cardId: "c", boardId: "b", columnId: "col", titulo: "T" });
    expect(n).toBe(1);
  });

  it("history mantém últimos eventos", () => {
    const bus = createDomainEventBus();
    bus.emit("card.created", { cardId: "c1", boardId: "b", columnId: "c", titulo: "T" });
    expect(bus.history()).toHaveLength(1);
  });
});
