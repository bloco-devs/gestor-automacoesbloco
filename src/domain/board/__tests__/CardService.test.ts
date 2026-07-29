import { describe, it, expect } from "vitest";
import { CardService, MemoryCardRepository } from "@/domain/board";
import { ValidationError } from "@/core/errors";
import { domainBus } from "@/core/events";

function makeService() {
  const repo = new MemoryCardRepository();
  return { repo, svc: new CardService(repo) };
}

describe("domain/board/CardService", () => {
  it("cria um card válido e emite card.created", async () => {
    const { svc } = makeService();
    const events: string[] = [];
    const off = domainBus.on("card.created", (e) => events.push(e.payload.cardId));

    const dto = await svc.create({
      boardId: "b1",
      columnId: "c1",
      titulo: "Nova tarefa",
      descricao: null,
      ordem: 0,
      dataEntrega: null,
      concluido: false,
    });

    expect(dto.titulo).toBe("Nova tarefa");
    expect(events).toHaveLength(1);
    expect(events[0]).toBe(dto.id);
    off();
  });

  it("rejeita título vazio", async () => {
    const { svc } = makeService();
    await expect(
      svc.create({
        boardId: "b1",
        columnId: "c1",
        titulo: "",
        descricao: null,
        ordem: 0,
        dataEntrega: null,
        concluido: false,
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("move card e emite card.moved com from/to", async () => {
    const { repo, svc } = makeService();
    const dto = await svc.create({
      boardId: "b1",
      columnId: "c1",
      titulo: "Tarefa",
      descricao: null,
      ordem: 0,
      dataEntrega: null,
      concluido: false,
    });

    const events: Array<{ from: string; to: string }> = [];
    const off = domainBus.on("card.moved", (e) => events.push({ from: e.payload.fromColumnId, to: e.payload.toColumnId }));

    await svc.move(dto.id, "c2", 3);
    const after = await repo.findById(dto.id);
    expect(after?.columnId).toBe("c2");
    expect(after?.ordem).toBe(3);
    expect(events).toEqual([{ from: "c1", to: "c2" }]);
    off();
  });
});
