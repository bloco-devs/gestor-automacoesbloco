import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type BoardVisibilidade = "private" | "workspace" | "public";
export type BoardRole = "owner" | "admin" | "member" | "observer";

export interface BoardResumo {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  icone: string | null;
  background: string | null;
  visibilidade: BoardVisibilidade;
  arquivado: boolean;
  workspaceId: string;
  workspaceNome: string;
  criadoPor: string | null;
  createdAt: string;
  updatedAt: string;
  totalCards: number;
  cardsAbertos: number;
  totalMembros: number;
  favorito: boolean;
  meuPapel: BoardRole | null;
  ultimaAtividade: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResumo(r: any): BoardResumo {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    descricao: r.descricao ?? null,
    cor: r.cor ?? null,
    icone: r.icone ?? null,
    background: r.background ?? null,
    visibilidade: (r.visibilidade ?? "workspace") as BoardVisibilidade,
    arquivado: !!r.arquivado,
    workspaceId: r.workspace_id,
    workspaceNome: r.workspace_nome ?? "",
    criadoPor: r.criado_por ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    totalCards: Number(r.total_cards ?? 0),
    cardsAbertos: Number(r.cards_abertos ?? 0),
    totalMembros: Number(r.total_membros ?? 0),
    favorito: !!r.favorito,
    meuPapel: (r.meu_papel ?? null) as BoardRole | null,
    ultimaAtividade: r.ultima_atividade ?? null,
  };
}

export async function listBoardsResumo(): Promise<BoardResumo[]> {
  const { data, error } = await sb
    .from("atividades_boards_resumo")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapResumo);
}

export async function getBoardResumo(boardId: string): Promise<BoardResumo | null> {
  const { data, error } = await sb
    .from("atividades_boards_resumo")
    .select("*")
    .eq("id", boardId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapResumo(data) : null;
}

export interface CreateBoardInput {
  nome: string;
  descricao?: string;
  visibilidade?: BoardVisibilidade;
  cor?: string | null;
  icone?: string | null;
  background?: string | null;
}

export async function createBoard(input: CreateBoardInput): Promise<string> {
  const { data, error } = await sb.rpc("atividades_create_board", {
    _nome: input.nome,
    _descricao: input.descricao ?? null,
    _visibilidade: input.visibilidade ?? "workspace",
    _cor: input.cor ?? null,
    _icone: input.icone ?? null,
    _background: input.background ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function toggleFavoritoBoard(boardId: string): Promise<boolean> {
  const { data, error } = await sb.rpc("atividades_board_toggle_favorito", {
    _board_id: boardId,
  });
  if (error) throw error;
  return !!data;
}

export async function setBoardArquivado(
  boardId: string,
  arquivado: boolean,
): Promise<void> {
  const { error } = await sb.rpc("atividades_board_set_arquivado", {
    _board_id: boardId,
    _arquivado: arquivado,
  });
  if (error) throw error;
}
