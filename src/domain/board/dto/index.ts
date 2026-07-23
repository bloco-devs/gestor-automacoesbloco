/**
 * DTOs expostos para a UI. Não incluem campos internos do banco (metadados privados, etc).
 */
export interface BoardDTO {
  id: string;
  nome: string;
  descricao: string | null;
  visibilidade: "private" | "workspace" | "public";
  arquivado: boolean;
}

export interface CardDTO {
  id: string;
  boardId: string;
  columnId: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dataEntrega: string | null;
  concluido: boolean;
}

export interface ColumnDTO {
  id: string;
  boardId: string;
  nome: string;
  chave: string;
  ordem: number;
  wipLimit: number | null;
  arquivada: boolean;
}
