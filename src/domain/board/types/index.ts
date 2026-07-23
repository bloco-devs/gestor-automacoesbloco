export type BoardVisibility = "private" | "workspace" | "public";
export type BoardMemberRole = "owner" | "admin" | "member" | "viewer";

export interface BoardEntity {
  id: string;
  nome: string;
  descricao: string | null;
  visibilidade: BoardVisibility;
  arquivado: boolean;
  criadoPor: string | null;
  criadoEm: string;
}

export interface CardEntity {
  id: string;
  boardId: string;
  columnId: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  dataEntrega: string | null;
  concluido: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface ColumnEntity {
  id: string;
  boardId: string;
  nome: string;
  chave: string;
  ordem: number;
  wipLimit: number | null;
  arquivada: boolean;
}
