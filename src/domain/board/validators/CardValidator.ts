import { ValidationError } from "@/core/errors";
import type { CardEntity } from "../types";

export const CardValidator = {
  create(input: Partial<CardEntity>): void {
    const issues: Array<{ path: string; message: string }> = [];
    if (!input.titulo || input.titulo.trim().length < 2) {
      issues.push({ path: "titulo", message: "Título deve ter pelo menos 2 caracteres" });
    }
    if (input.titulo && input.titulo.length > 200) {
      issues.push({ path: "titulo", message: "Título deve ter no máximo 200 caracteres" });
    }
    if (!input.boardId) issues.push({ path: "boardId", message: "boardId é obrigatório" });
    if (!input.columnId) issues.push({ path: "columnId", message: "columnId é obrigatório" });
    if (issues.length) throw new ValidationError(issues);
  },

  update(patch: Partial<CardEntity>): void {
    const issues: Array<{ path: string; message: string }> = [];
    if (patch.titulo !== undefined && patch.titulo.trim().length < 2) {
      issues.push({ path: "titulo", message: "Título deve ter pelo menos 2 caracteres" });
    }
    if (issues.length) throw new ValidationError(issues);
  },
};
