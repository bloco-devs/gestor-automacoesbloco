import type { BoardEntity, CardEntity, ColumnEntity } from "../types";
import type { BoardDTO, CardDTO, ColumnDTO } from "../dto";

export function boardToDTO(b: BoardEntity): BoardDTO {
  return {
    id: b.id,
    nome: b.nome,
    descricao: b.descricao,
    visibilidade: b.visibilidade,
    arquivado: b.arquivado,
  };
}

export function cardToDTO(c: CardEntity): CardDTO {
  return {
    id: c.id,
    boardId: c.boardId,
    columnId: c.columnId,
    titulo: c.titulo,
    descricao: c.descricao,
    ordem: c.ordem,
    dataEntrega: c.dataEntrega,
    concluido: c.concluido,
  };
}

export function columnToDTO(c: ColumnEntity): ColumnDTO {
  return {
    id: c.id,
    boardId: c.boardId,
    nome: c.nome,
    chave: c.chave,
    ordem: c.ordem,
    wipLimit: c.wipLimit,
    arquivada: c.arquivada,
  };
}
