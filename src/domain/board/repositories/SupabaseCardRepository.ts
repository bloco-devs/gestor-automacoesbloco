import { supabase } from "@/integrations/supabase/client";
import { NotFoundError, RepositoryError } from "@/core/errors";
import type { CardRepository } from "./CardRepository";
import type { CardEntity } from "../types";

interface Row {
  id: string;
  board_id: string;
  coluna_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  data_entrega: string | null;
  concluido: boolean;
  criado_em: string;
  atualizado_em: string;
}

function rowToEntity(r: Row): CardEntity {
  return {
    id: r.id,
    boardId: r.board_id,
    columnId: r.coluna_id,
    titulo: r.titulo,
    descricao: r.descricao,
    ordem: r.ordem,
    dataEntrega: r.data_entrega,
    concluido: r.concluido,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  };
}

/**
 * Adaptador Supabase de leitura para cards de Atividades.
 * ADITIVO: não substitui `useAtividadesBoard` — coexiste para permitir migração incremental.
 */
export class SupabaseCardRepository implements CardRepository {
  async findById(id: string): Promise<CardEntity | null> {
    const { data, error } = await supabase
      .from("atividades_cards")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, board_id, coluna_id, titulo, descricao, ordem, data_entrega, concluido, criado_em:created_at, atualizado_em:updated_at" as any)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new RepositoryError(error.message, error);
    return data ? rowToEntity(data as unknown as Row) : null;
  }

  async findAll(): Promise<CardEntity[]> {
    throw new RepositoryError("findAll não suportado — use findByBoard(boardId)");
  }

  async findByBoard(boardId: string): Promise<CardEntity[]> {
    const { data, error } = await supabase
      .from("atividades_cards")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, board_id, coluna_id, titulo, descricao, ordem, data_entrega, concluido, criado_em:created_at, atualizado_em:updated_at" as any)
      .eq("board_id", boardId)
      .order("ordem", { ascending: true });
    if (error) throw new RepositoryError(error.message, error);
    return (data ?? []).map((r) => rowToEntity(r as unknown as Row));
  }

  async create(): Promise<CardEntity> {
    throw new RepositoryError("SupabaseCardRepository.create ainda não implementado — use serviço de criação existente");
  }

  async update(id: string, patch: Partial<CardEntity>): Promise<CardEntity> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbPatch: Record<string, any> = {};
    if (patch.titulo !== undefined) dbPatch.titulo = patch.titulo;
    if (patch.descricao !== undefined) dbPatch.descricao = patch.descricao;
    if (patch.columnId !== undefined) dbPatch.coluna_id = patch.columnId;
    if (patch.ordem !== undefined) dbPatch.ordem = patch.ordem;
    if (patch.dataEntrega !== undefined) dbPatch.data_entrega = patch.dataEntrega;
    if (patch.concluido !== undefined) dbPatch.concluido = patch.concluido;

    const { data, error } = await supabase
      .from("atividades_cards")
      .update(dbPatch)
      .eq("id", id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, board_id, coluna_id, titulo, descricao, ordem, data_entrega, concluido, criado_em:created_at, atualizado_em:updated_at" as any)
      .maybeSingle();
    if (error) throw new RepositoryError(error.message, error);
    if (!data) throw new NotFoundError("Card", id);
    return rowToEntity(data as unknown as Row);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("atividades_cards").delete().eq("id", id);
    if (error) throw new RepositoryError(error.message, error);
  }

  async move(cardId: string, toColumnId: string, toIndex: number): Promise<CardEntity> {
    return this.update(cardId, { columnId: toColumnId, ordem: toIndex });
  }
}
