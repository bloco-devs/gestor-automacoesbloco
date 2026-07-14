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
  coverUrl: string | null;
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
    coverUrl: r.cover_url ?? null,
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

// ===== Q3: Board settings =====

export interface UpdateBoardInput {
  nome?: string;
  descricao?: string | null;
  cor?: string | null;
  icone?: string | null;
  background?: string | null;
  coverUrl?: string | null;
  visibilidade?: BoardVisibilidade;
}

export async function updateBoard(
  boardId: string,
  input: UpdateBoardInput,
): Promise<void> {
  const { error } = await sb.rpc("atividades_board_update", {
    _board_id: boardId,
    _nome: input.nome ?? null,
    _descricao: input.descricao ?? null,
    _cor: input.cor ?? null,
    _icone: input.icone ?? null,
    _background: input.background ?? null,
    _cover_url: input.coverUrl ?? null,
    _visibilidade: input.visibilidade ?? null,
  });
  if (error) throw error;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await sb.rpc("atividades_board_delete", {
    _board_id: boardId,
  });
  if (error) throw error;
}

// ===== Q3: Membros =====

export interface BoardMembro {
  userId: string;
  boardId: string;
  role: BoardRole;
  nome: string;
  email: string;
  createdAt: string;
}

export async function listBoardMembros(boardId: string): Promise<BoardMembro[]> {
  const { data: mems, error } = await sb
    .from("atividades_board_membros")
    .select("board_id, user_id, role, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (mems ?? []) as Array<{
    board_id: string;
    user_id: string;
    role: BoardRole;
    created_at: string;
  }>;
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.user_id);
  const { data: profs } = await sb
    .from("profiles")
    .select("id, nome, email")
    .in("id", ids);
  const map = new Map<string, { nome: string; email: string }>(
    (profs ?? []).map((p: { id: string; nome?: string; email?: string }) => [
      p.id,
      { nome: p.nome ?? "", email: p.email ?? "" },
    ]),
  );
  return rows.map((r) => ({
    userId: r.user_id,
    boardId: r.board_id,
    role: r.role,
    nome: map.get(r.user_id)?.nome || "Usuário",
    email: map.get(r.user_id)?.email || "",
    createdAt: r.created_at,
  }));
}

export async function addBoardMembro(
  boardId: string,
  userId: string,
  role: BoardRole = "member",
): Promise<void> {
  const { error } = await sb.rpc("atividades_board_add_member", {
    _board_id: boardId,
    _user_id: userId,
    _role: role,
  });
  if (error) throw error;
}

export async function removeBoardMembro(
  boardId: string,
  userId: string,
): Promise<void> {
  const { error } = await sb.rpc("atividades_board_remove_member", {
    _board_id: boardId,
    _user_id: userId,
  });
  if (error) throw error;
}

export async function setBoardMembroRole(
  boardId: string,
  userId: string,
  role: BoardRole,
): Promise<void> {
  const { error } = await sb.rpc("atividades_board_set_member_role", {
    _board_id: boardId,
    _user_id: userId,
    _role: role,
  });
  if (error) throw error;
}

// ===== Q3: Colunas (admin) =====

export async function criarColuna(boardId: string, nome: string): Promise<string> {
  const { data, error } = await sb.rpc("atividades_coluna_create", {
    _board_id: boardId,
    _nome: nome,
    _chave: null,
  });
  if (error) throw error;
  return data as string;
}

export async function renomearColuna(colunaId: string, nome: string): Promise<void> {
  const { error } = await sb.rpc("atividades_coluna_update", {
    _coluna_id: colunaId,
    _nome: nome,
  });
  if (error) throw error;
}

export async function excluirColuna(colunaId: string): Promise<void> {
  const { error } = await sb.rpc("atividades_coluna_delete", {
    _coluna_id: colunaId,
  });
  if (error) throw error;
}

export async function arquivarColuna(
  colunaId: string,
  arquivada: boolean,
): Promise<void> {
  const { error } = await sb.rpc("atividades_coluna_set_arquivada", {
    _coluna_id: colunaId,
    _arquivada: arquivada,
  });
  if (error) throw error;
}

export async function duplicarColuna(colunaId: string): Promise<string> {
  const { data, error } = await sb.rpc("atividades_coluna_duplicate", {
    _coluna_id: colunaId,
  });
  if (error) throw error;
  return data as string;
}

export async function reordenarColunas(
  boardId: string,
  items: Array<{ id: string; ordem: number }>,
): Promise<void> {
  const { error } = await sb.rpc("atividades_coluna_reorder", {
    _board_id: boardId,
    _items: items,
  });
  if (error) throw error;
}

// ===== Q3: Labels via RPC (com histórico) =====

export async function upsertLabel(
  boardId: string,
  input: { id?: string | null; nome: string; cor: string },
): Promise<string> {
  const { data, error } = await sb.rpc("atividades_label_upsert", {
    _board_id: boardId,
    _id: input.id ?? null,
    _nome: input.nome,
    _cor: input.cor,
  });
  if (error) throw error;
  return data as string;
}

export async function excluirLabel(labelId: string): Promise<void> {
  const { error } = await sb.rpc("atividades_label_delete", {
    _label_id: labelId,
  });
  if (error) throw error;
}

// ===== Q3: Histórico =====

export interface BoardHistoricoItem {
  id: string;
  boardId: string;
  userId: string | null;
  userEmail: string | null;
  evento: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export async function listBoardHistorico(
  boardId: string,
  limit = 100,
): Promise<BoardHistoricoItem[]> {
  const { data, error } = await sb
    .from("atividades_board_historico")
    .select("id, board_id, user_id, user_email, evento, payload, created_at")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      board_id: string;
      user_id: string | null;
      user_email: string | null;
      evento: string;
      payload: Record<string, unknown> | null;
      created_at: string;
    }) => ({
      id: r.id,
      boardId: r.board_id,
      userId: r.user_id,
      userEmail: r.user_email,
      evento: r.evento,
      payload: r.payload ?? {},
      createdAt: r.created_at,
    }),
  );
}

// ===== Q3.5: WIP / Labels favoritas / Reorder labels =====

export async function setColunaWip(colunaId: string, wip: number | null): Promise<void> {
  const { error } = await sb.rpc("atividades_coluna_set_wip", {
    _coluna_id: colunaId,
    _wip: wip == null || wip <= 0 ? null : wip,
  });
  if (error) throw error;
}

/**
 * Alterna favorito de etiqueta para o usuário atual (Q3.6).
 * O parâmetro `favorita` é ignorado quando não coincide com o estado atual —
 * o RPC decide o novo valor baseado na tabela `atividades_label_favoritos`.
 */
export async function setLabelFavorita(labelId: string, _favorita?: boolean): Promise<boolean> {
  const { data, error } = await sb.rpc("atividades_label_toggle_favorita", {
    _label_id: labelId,
  });
  if (error) throw error;
  return !!data;
}

export async function reorderLabels(
  boardId: string,
  items: Array<{ id: string; ordem: number }>,
): Promise<void> {
  const { error } = await sb.rpc("atividades_label_reorder", {
    _board_id: boardId,
    _items: items,
  });
  if (error) throw error;
}

// Contagem de cards por etiqueta neste board (client-side aggregation)
export async function countCardsByLabel(boardId: string): Promise<Map<string, number>> {
  const { data, error } = await sb
    .from("atividades_card_labels")
    .select("label_id, atividades_cards!inner(board_id)")
    .eq("atividades_cards.board_id", boardId);
  if (error) throw error;
  const m = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ label_id: string }>) {
    m.set(r.label_id, (m.get(r.label_id) ?? 0) + 1);
  }
  return m;
}

// ===== Q3.5: Upload de capa (bucket privado, signed URL) =====

export const CAPAS_BUCKET = "atividades-capas";
export const CAPA_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
export const CAPA_ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function validateCapa(file: File): string | null {
  if (file.size <= 0) return "Arquivo vazio.";
  if (file.size > CAPA_MAX_SIZE) return `Imagem excede 5 MB.`;
  if (!CAPA_ALLOWED.has(file.type)) return "Formato inválido (use PNG, JPG, WEBP ou GIF).";
  return null;
}

export async function uploadCoverImage(
  boardId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "img").toLowerCase().slice(0, 5);
  const path = `${boardId}/cover-${Date.now()}.${ext}`;
  const { error } = await sb.storage
    .from(CAPAS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  return path;
}

export async function removeCoverImage(path: string): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await sb.storage.from(CAPAS_BUCKET).remove([path]);
  if (error && !String(error.message || "").includes("Not found")) throw error;
}

export async function getCoverDisplayUrl(pathOrUrl: string | null): Promise<string | null> {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await sb.storage
    .from(CAPAS_BUCKET)
    .createSignedUrl(pathOrUrl, 60 * 60 * 24 * 7);
  if (error) return null;
  return (data?.signedUrl as string) ?? null;
}
