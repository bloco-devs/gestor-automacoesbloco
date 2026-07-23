import { domainBus } from "@/core/events";
import { CardValidator } from "../validators/CardValidator";
import type { CardRepository } from "../repositories/CardRepository";
import type { CardEntity } from "../types";
import { cardToDTO } from "../mappers";
import type { CardDTO } from "../dto";

/**
 * Serviço de aplicação para Cards.
 * Aditivo: componentes Atividades continuam usando hooks existentes.
 * Novos módulos (bulk actions, undo/redo) consumirão CardService.
 */
export class CardService {
  constructor(private readonly repo: CardRepository) {}

  async create(input: Omit<CardEntity, "id" | "criadoEm" | "atualizadoEm">): Promise<CardDTO> {
    CardValidator.create(input);
    const now = new Date().toISOString();
    const entity = await this.repo.create({ ...input, criadoEm: now, atualizadoEm: now } as Omit<CardEntity, "id">);
    domainBus.emit("card.created", {
      cardId: entity.id,
      boardId: entity.boardId,
      columnId: entity.columnId,
      titulo: entity.titulo,
    });
    return cardToDTO(entity);
  }

  async update(id: string, patch: Partial<CardEntity>): Promise<CardDTO> {
    CardValidator.update(patch);
    const entity = await this.repo.update(id, patch);
    domainBus.emit("card.updated", { cardId: id, boardId: entity.boardId, changes: patch as Record<string, unknown> });
    return cardToDTO(entity);
  }

  async move(cardId: string, toColumnId: string, toIndex: number): Promise<CardDTO> {
    const current = await this.repo.findById(cardId);
    if (!current) throw Object.assign(new Error("Card não encontrado"), { code: "NOT_FOUND" });
    const entity = await this.repo.move(cardId, toColumnId, toIndex);
    domainBus.emit("card.moved", {
      cardId,
      boardId: entity.boardId,
      fromColumnId: current.columnId,
      toColumnId,
      toIndex,
    });
    return cardToDTO(entity);
  }

  async delete(id: string): Promise<void> {
    const current = await this.repo.findById(id);
    await this.repo.delete(id);
    if (current) domainBus.emit("card.deleted", { cardId: id, boardId: current.boardId });
  }
}
