import type { CardEntity } from "../types";
import type { Repository } from "@/domain/shared";

export interface CardRepository extends Repository<CardEntity> {
  findByBoard(boardId: string): Promise<CardEntity[]>;
  move(cardId: string, toColumnId: string, toIndex: number): Promise<CardEntity>;
}
