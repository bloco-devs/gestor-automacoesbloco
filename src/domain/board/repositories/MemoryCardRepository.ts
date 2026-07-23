import type { CardRepository } from "./CardRepository";
import type { CardEntity } from "../types";
import { NotFoundError } from "@/core/errors";

/** Impl em memória para testes. */
export class MemoryCardRepository implements CardRepository {
  private store = new Map<string, CardEntity>();

  seed(cards: CardEntity[]): void {
    this.store.clear();
    cards.forEach((c) => this.store.set(c.id, c));
  }

  async findById(id: string): Promise<CardEntity | null> {
    return this.store.get(id) ?? null;
  }
  async findAll(): Promise<CardEntity[]> {
    return Array.from(this.store.values());
  }
  async findByBoard(boardId: string): Promise<CardEntity[]> {
    return Array.from(this.store.values()).filter((c) => c.boardId === boardId);
  }
  async create(input: Omit<CardEntity, "id">): Promise<CardEntity> {
    const id = crypto.randomUUID();
    const entity: CardEntity = { ...input, id } as CardEntity;
    this.store.set(id, entity);
    return entity;
  }
  async update(id: string, patch: Partial<CardEntity>): Promise<CardEntity> {
    const cur = this.store.get(id);
    if (!cur) throw new NotFoundError("Card", id);
    const next = { ...cur, ...patch, atualizadoEm: new Date().toISOString() };
    this.store.set(id, next);
    return next;
  }
  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
  async move(cardId: string, toColumnId: string, toIndex: number): Promise<CardEntity> {
    return this.update(cardId, { columnId: toColumnId, ordem: toIndex });
  }
}
