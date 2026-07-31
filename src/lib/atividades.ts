import type React from "react";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// ---------- Tipos ----------

export interface AtividadeColuna {
  id: string;
  chave: string;
  nome: string;
  ordem: number;
  boardId: string;
  arquivada?: boolean;
  arquivadaEm?: string | null;
  wipLimit?: number | null;
}



export interface ChecklistItem {
  id: string;
  texto: string;
  concluido: boolean;
}

export interface CardLink {
  id: string;
  label: string;
  url: string;
}

export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export interface AtividadeCard {
  id: string;
  colunaId: string;
  boardId: string;
  titulo: string;
  descricao: string;
  responsavelId: string | null;
  responsavelIds: string[];
  responsavelPersonaIds: string[];
  solucaoId: string | null;
  ordem: number;
  checklist: ChecklistItem[];
  links: CardLink[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  dataEntrega: string | null;
  concluido: boolean;
  dataConclusao: string | null;
  coverCor: string | null;
  prioridade: Prioridade | null;
  labelIds: string[];
}

export interface AtividadePersona {
  id: string;
  userId: string;
  nome: string;
  ativo: boolean;
}

export interface AtividadeLabel {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  boardId: string;
  favorita?: boolean;
}


export interface AtividadeLogEntry {
  id: string;
  cardId: string;
  userId: string | null;
  userEmail: string | null;
  tipo: string;
  entity: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AtividadeBoard {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
}

// ---------- Mappers ----------

const SELECT_COLS =
  "id, coluna_id, board_id, titulo, descricao, responsavel_id, responsavel_ids, responsavel_persona_ids, solucao_id, ordem, checklist, links, created_by, created_at, updated_at, data_entrega, concluido, data_conclusao, cover_cor, prioridade";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(r: any, labelIds: string[] = []): AtividadeCard {
  return {
    id: r.id,
    colunaId: r.coluna_id,
    boardId: r.board_id,
    titulo: r.titulo,
    descricao: r.descricao ?? "",
    responsavelId: r.responsavel_id,
    responsavelIds: Array.isArray(r.responsavel_ids)
      ? r.responsavel_ids
      : r.responsavel_id
        ? [r.responsavel_id]
        : [],
    responsavelPersonaIds: Array.isArray(r.responsavel_persona_ids)
      ? r.responsavel_persona_ids
      : [],
    solucaoId: r.solucao_id,
    ordem: r.ordem ?? 0,
    checklist: Array.isArray(r.checklist) ? r.checklist : [],
    links: Array.isArray(r.links) ? r.links : [],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    dataEntrega: r.data_entrega ?? null,
    concluido: !!r.concluido,
    dataConclusao: r.data_conclusao ?? null,
    coverCor: r.cover_cor ?? null,
    prioridade: (r.prioridade as Prioridade | null) ?? null,
    labelIds,
  };
}

// ---------- Boards ----------

export async function listBoards(): Promise<AtividadeBoard[]> {
  const { data, error } = await sb
    .from("atividades_boards")
    .select("id, slug, nome, ordem")
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(
    (r: { id: string; slug: string; nome: string; ordem: number }) => ({
      id: r.id,
      slug: r.slug,
      nome: r.nome,
      ordem: r.ordem,
    }),
  );
}

export async function getDefaultBoardId(): Promise<string> {
  const { data, error } = await sb
    .from("atividades_boards")
    .select("id")
    .eq("slug", "default")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Board padrão ausente");
  return data.id as string;
}

// ---------- Personas / Colunas / Labels / Cards ----------

export async function listPersonas(): Promise<AtividadePersona[]> {
  const { data, error } = await sb
    .from("atividades_personas")
    .select("id, user_id, nome, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(
    (r: { id: string; user_id: string; nome: string; ativo: boolean }) => ({
      id: r.id,
      userId: r.user_id,
      nome: r.nome,
      ativo: r.ativo,
    }),
  );
}

export async function listColunas(
  boardId?: string,
  opts: { includeArquivadas?: boolean } = {},
): Promise<AtividadeColuna[]> {
  let q = sb
    .from("atividades_colunas")
    .select("id, chave, nome, ordem, board_id, arquivada, arquivada_em, wip_limit")
    .order("ordem", { ascending: true });
  if (boardId) q = q.eq("board_id", boardId);
  if (!opts.includeArquivadas) q = q.eq("arquivada", false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      chave: string;
      nome: string;
      ordem: number;
      board_id: string;
      arquivada?: boolean;
      arquivada_em?: string | null;
      wip_limit?: number | null;
    }) => ({
      id: r.id,
      chave: r.chave,
      nome: r.nome,
      ordem: r.ordem,
      boardId: r.board_id,
      arquivada: !!r.arquivada,
      arquivadaEm: r.arquivada_em ?? null,
      wipLimit: r.wip_limit ?? null,
    }),
  );
}



export async function listCards(boardId?: string): Promise<AtividadeCard[]> {
  const cardsQ = sb.from("atividades_cards").select(SELECT_COLS).order("ordem", { ascending: true });
  const [cardsRes, linksRes] = await Promise.all([
    boardId ? cardsQ.eq("board_id", boardId) : cardsQ,
    sb.from("atividades_card_labels").select("card_id, label_id"),
  ]);
  if (cardsRes.error) throw cardsRes.error;
  if (linksRes.error) throw linksRes.error;
  const labelsByCard = new Map<string, string[]>();
  for (const l of linksRes.data ?? []) {
    const arr = labelsByCard.get(l.card_id) ?? [];
    arr.push(l.label_id);
    labelsByCard.set(l.card_id, arr);
  }
  return (cardsRes.data ?? []).map((r: { id: string }) => mapCard(r, labelsByCard.get(r.id) ?? []));
}

export async function getCardById(id: string): Promise<AtividadeCard | null> {
  const [cardRes, linksRes] = await Promise.all([
    sb.from("atividades_cards").select(SELECT_COLS).eq("id", id).maybeSingle(),
    sb.from("atividades_card_labels").select("label_id").eq("card_id", id),
  ]);
  if (cardRes.error) throw cardRes.error;
  if (linksRes.error) throw linksRes.error;
  if (!cardRes.data) return null;
  const labelIds = (linksRes.data ?? []).map((r: { label_id: string }) => r.label_id);
  return mapCard(cardRes.data, labelIds);
}

export async function listLabels(boardId?: string): Promise<AtividadeLabel[]> {
  let q = sb
    .from("atividades_labels")
    .select("id, nome, cor, ordem, board_id")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (boardId) q = q.eq("board_id", boardId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as Array<{ id: string; nome: string; cor: string; ordem: number; board_id: string }>;

  // Favoritas: preferência individual (Q3.6)
  const { data: userData } = await sb.auth.getUser();
  const uid = userData?.user?.id as string | undefined;
  const favSet = new Set<string>();
  if (uid && rows.length > 0) {
    const { data: favs } = await sb
      .from("atividades_label_favoritos")
      .select("label_id")
      .eq("user_id", uid)
      .in("label_id", rows.map((r) => r.id));
    for (const f of (favs ?? []) as Array<{ label_id: string }>) favSet.add(f.label_id);
  }

  const mapped = rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    cor: r.cor,
    ordem: r.ordem,
    boardId: r.board_id,
    favorita: favSet.has(r.id),
  }));
  // Favoritas primeiro, mantendo ordem original em cada grupo
  mapped.sort((a, b) => Number(b.favorita) - Number(a.favorita) || a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  return mapped;
}


export async function createLabel(input: {
  nome: string;
  cor: string;
  boardId: string;
}): Promise<AtividadeLabel> {
  const { data, error } = await sb
    .from("atividades_labels")
    .insert({ nome: input.nome, cor: input.cor, board_id: input.boardId })
    .select("id, nome, cor, ordem, board_id")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    nome: data.nome,
    cor: data.cor,
    ordem: data.ordem,
    boardId: data.board_id,
  };
}

export async function updateLabel(
  id: string,
  patch: { nome?: string; cor?: string },
): Promise<void> {
  const { error } = await sb.from("atividades_labels").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteLabel(id: string): Promise<void> {
  const { error } = await sb.from("atividades_labels").delete().eq("id", id);
  if (error) throw error;
}

export async function setCardLabels(cardId: string, labelIds: string[]): Promise<void> {
  const { data: existing, error: e1 } = await sb
    .from("atividades_card_labels")
    .select("label_id")
    .eq("card_id", cardId);
  if (e1) throw e1;
  const current = new Set<string>((existing ?? []).map((r: { label_id: string }) => r.label_id));
  const next = new Set<string>(labelIds);
  const toAdd = [...next].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));
  if (toAdd.length > 0) {
    const { error } = await sb
      .from("atividades_card_labels")
      .insert(toAdd.map((label_id) => ({ card_id: cardId, label_id })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await sb
      .from("atividades_card_labels")
      .delete()
      .eq("card_id", cardId)
      .in("label_id", toRemove);
    if (error) throw error;
  }
}

export async function listActivityLog(cardId: string): Promise<AtividadeLogEntry[]> {
  const { data, error } = await sb
    .from("atividades_atividade_log")
    .select("id, card_id, user_id, user_email, tipo, entity, payload, created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(
    (r: {
      id: string;
      card_id: string;
      user_id: string | null;
      user_email: string | null;
      tipo: string;
      entity: string | null;
      payload: Record<string, unknown>;
      created_at: string;
    }) => ({
      id: r.id,
      cardId: r.card_id,
      userId: r.user_id,
      userEmail: r.user_email,
      tipo: r.tipo,
      entity: r.entity ?? "card",
      payload: r.payload ?? {},
      createdAt: r.created_at,
    }),
  );
}

// ---------- Card mutations ----------

export interface CreateCardInput {
  boardId: string;
  colunaId: string;
  titulo: string;
  descricao?: string;
  responsavelIds?: string[];
  responsavelPersonaIds?: string[];
  solucaoId?: string | null;
  checklist?: ChecklistItem[];
  links?: CardLink[];
  createdBy?: string | null;
  ordem?: number;
  dataEntrega?: string | null;
  prioridade?: Prioridade | null;
  coverCor?: string | null;
  labelIds?: string[];
}

export async function createCard(input: CreateCardInput): Promise<AtividadeCard> {
  const ids = input.responsavelIds ?? [];
  const personaIds = input.responsavelPersonaIds ?? [];
  /**
   * `prioridade` é NOT NULL no banco (default 'media'). Enviar `null` explícito
   * fazia o PostgREST devolver 400 — a causa do bug de criação inline. Só
   * mandamos a coluna quando há valor; o default cobre o resto.
   */
  const payload: Record<string, unknown> = {
    board_id: input.boardId,
    coluna_id: input.colunaId,
    titulo: input.titulo,
    descricao: input.descricao ?? "",
    responsavel_id: ids[0] ?? null,
    responsavel_ids: ids,
    responsavel_persona_ids: personaIds,
    solucao_id: input.solucaoId ?? null,
    checklist: input.checklist ?? [],
    links: input.links ?? [],
    created_by: input.createdBy ?? null,
    ordem: input.ordem ?? 0,
    data_entrega: input.dataEntrega ?? null,
    cover_cor: input.coverCor ?? null,
  };
  if (input.prioridade) payload.prioridade = input.prioridade;

  const { data, error } = await sb
    .from("atividades_cards")
    .insert(payload)
    .select(SELECT_COLS)
    .single();
  if (error) {
    console.error("[createCard] falha ao inserir cartão", {
      boardId: input.boardId,
      colunaId: input.colunaId,
      titulo: input.titulo,
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
    throw error;
  }
  const labelIds = input.labelIds ?? [];
  if (labelIds.length > 0) {
    await setCardLabels(data.id, labelIds);
  }
  return mapCard(data, labelIds);
}

export interface UpdateCardPatch {
  titulo?: string;
  descricao?: string;
  responsavelIds?: string[];
  responsavelPersonaIds?: string[];
  solucaoId?: string | null;
  colunaId?: string;
  ordem?: number;
  checklist?: ChecklistItem[];
  links?: CardLink[];
  dataEntrega?: string | null;
  prioridade?: Prioridade | null;
  coverCor?: string | null;
  concluido?: boolean;
  labelIds?: string[];
}

export async function updateCard(id: string, patch: UpdateCardPatch): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd: Record<string, any> = {};
  if (patch.titulo !== undefined) upd.titulo = patch.titulo;
  if (patch.descricao !== undefined) upd.descricao = patch.descricao;
  if (patch.responsavelIds !== undefined) {
    upd.responsavel_ids = patch.responsavelIds;
    upd.responsavel_id = patch.responsavelIds[0] ?? null;
  }
  if (patch.responsavelPersonaIds !== undefined) {
    upd.responsavel_persona_ids = patch.responsavelPersonaIds;
  }
  if (patch.solucaoId !== undefined) upd.solucao_id = patch.solucaoId;
  if (patch.colunaId !== undefined) upd.coluna_id = patch.colunaId;
  if (patch.ordem !== undefined) upd.ordem = patch.ordem;
  if (patch.checklist !== undefined) upd.checklist = patch.checklist;
  if (patch.links !== undefined) upd.links = patch.links;
  if (patch.dataEntrega !== undefined) upd.data_entrega = patch.dataEntrega;
  if (patch.prioridade !== undefined) upd.prioridade = patch.prioridade;
  if (patch.coverCor !== undefined) upd.cover_cor = patch.coverCor;
  if (patch.concluido !== undefined) upd.concluido = patch.concluido;
  if (Object.keys(upd).length > 0) {
    const { error } = await sb.from("atividades_cards").update(upd).eq("id", id);
    if (error) throw error;
  }
  if (patch.labelIds !== undefined) {
    await setCardLabels(id, patch.labelIds);
  }
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await sb.from("atividades_cards").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Reordena vários cartões em uma única chamada RPC (transacional,
 * validação de auth/role/escopo feita no servidor).
 */
export async function reorderCardsBulk(
  updates: { id: string; colunaId: string; ordem: number }[],
): Promise<void> {
  if (updates.length === 0) return;
  const items = updates.map((u) => ({
    id: u.id,
    coluna_id: u.colunaId,
    ordem: u.ordem,
  }));
  const { error } = await sb.rpc("atividades_reorder_cards", { items });
  if (error) throw error;
}

// ---------- Comentários ----------

export interface CardComentario {
  id: string;
  cardId: string;
  userId: string | null;
  texto: string;
  createdAt: string;
  updatedAt: string;
  /** Autor resolvido a partir de `profiles` — nulo quando o perfil não existe. */
  autorNome: string | null;
  autorAvatarUrl: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComentario(r: any): CardComentario {
  return {
    id: r.id,
    cardId: r.card_id,
    userId: r.user_id,
    texto: r.texto,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    autorNome: null,
    autorAvatarUrl: null,
  };
}

export async function listComentarios(cardId: string): Promise<CardComentario[]> {
  const { data, error } = await sb
    .from("atividades_comentarios")
    .select("id, card_id, user_id, texto, created_at, updated_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const comentarios = (data ?? []).map(mapComentario);

  // O autor vem de `profiles` numa segunda consulta em lote: não há FK
  // declarada para o PostgREST embutir o join, e uma query por comentário
  // custaria N chamadas para desenhar N avatares.
  const ids = [...new Set(comentarios.map((c) => c.userId).filter(Boolean))] as string[];
  if (ids.length === 0) return comentarios;
  const { data: perfis } = await sb
    .from("profiles")
    .select("id, nome, email, avatar_url")
    .in("id", ids);
  const porId = new Map<string, { nome: string | null; avatarUrl: string | null }>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (perfis ?? []).map((p: any) => [
      p.id as string,
      { nome: (p.nome as string) || (p.email as string) || null, avatarUrl: p.avatar_url ?? null },
    ]),
  );
  return comentarios.map((c) => {
    const perfil = c.userId ? porId.get(c.userId) : undefined;
    return { ...c, autorNome: perfil?.nome ?? null, autorAvatarUrl: perfil?.avatarUrl ?? null };
  });
}

export async function createComentario(input: {
  cardId: string;
  userId: string;
  texto: string;
}): Promise<CardComentario> {
  const { data, error } = await sb
    .from("atividades_comentarios")
    .insert({ card_id: input.cardId, user_id: input.userId, texto: input.texto })
    .select("id, card_id, user_id, texto, created_at, updated_at")
    .single();
  if (error) throw error;
  return mapComentario(data);
}

export async function updateComentario(id: string, texto: string): Promise<void> {
  const { error } = await sb.from("atividades_comentarios").update({ texto }).eq("id", id);
  if (error) throw error;
}

export async function deleteComentario(id: string): Promise<void> {
  const { error } = await sb.from("atividades_comentarios").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================
// Helpers de UI (paleta e status de prazo)
// ============================================================

// Paleta oficial Trello (cores base) — usada como referência para labels/covers/colunas.
const TRELLO_HEX: Record<string, string> = {
  green: "#4bce97",
  yellow: "#f5cd47",
  orange: "#fea362",
  red: "#f87168",
  purple: "#9f8fef",
  blue: "#579dff",
  sky: "#6cc3e0",
  lime: "#94c748",
  pink: "#e774bb",
  black: "#8590a2",
  slate: "#8590a2",
};

// Versão "escura/saturada" (para textos e barras em modo claro)
const TRELLO_HEX_BOLD: Record<string, string> = {
  green: "#1f845a",
  yellow: "#946f00",
  orange: "#b65c02",
  red: "#c9372c",
  purple: "#6e5dc6",
  blue: "#0c66e4",
  sky: "#227d9b",
  lime: "#5b7f24",
  pink: "#ae4787",
  black: "#44546f",
  slate: "#44546f",
};

export const LABEL_COLORS: { key: string; className: string; label: string }[] = [
  { key: "green", label: "Verde", className: "" },
  { key: "yellow", label: "Amarelo", className: "" },
  { key: "orange", label: "Laranja", className: "" },
  { key: "red", label: "Vermelho", className: "" },
  { key: "purple", label: "Roxo", className: "" },
  { key: "blue", label: "Azul", className: "" },
  { key: "sky", label: "Ciano", className: "" },
  { key: "lime", label: "Lima", className: "" },
  { key: "pink", label: "Rosa", className: "" },
  { key: "slate", label: "Cinza", className: "" },
];

function isHexColor(cor: string | null | undefined): cor is string {
  return typeof cor === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(cor.trim());
}

/** Escolhe texto preto/branco de máxima legibilidade sobre `hex`. */
function readableTextOn(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // luminância relativa
  const L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return L > 0.6 ? "#172b4d" : "#ffffff";
}

/** Estilo de label "estilo Trello": preenchimento sólido, texto legível. */
export function labelColorStyle(cor: string | null | undefined): React.CSSProperties | undefined {
  const hex = isHexColor(cor)
    ? cor.trim()
    : (cor && TRELLO_HEX[cor]) || undefined;
  if (!hex) return undefined;
  return {
    backgroundColor: hex,
    borderColor: hex,
    color: readableTextOn(hex),
  };
}

export function labelColorClass(_cor: string | null | undefined): string {
  // Sempre usamos style inline (mais fiel ao Trello). Mantemos borda p/ contorno consistente.
  return "border font-semibold tracking-wide";
}

export function coverColorStyle(cor: string | null | undefined): React.CSSProperties | undefined {
  if (isHexColor(cor)) return { backgroundColor: cor };
  if (cor && TRELLO_HEX[cor]) return { backgroundColor: TRELLO_HEX[cor] };
  return undefined;
}

export function coverColorClass(_cor: string | null | undefined): string {
  return "";
}




export interface ColunaAccent {
  header: string;
  bar: string;
  column: string;
  style: React.CSSProperties;
  barStyle: React.CSSProperties;
}

/**
 * Cor de destaque para a coluna do Kanban — paleta Trello vívida,
 * boa em modo claro e dark. Heurística por nome com fallback rotativo.
 */
export function colunaAccent(nome: string, ordem: number): ColunaAccent {
  const n = (nome ?? "").toLowerCase();
  const match = (keys: string[]) => keys.some((k) => n.includes(k));

  let key: keyof typeof TRELLO_HEX;
  if (match(["feito", "concluí", "concluido", "done", "pronto"])) key = "green";
  else if (match(["aprovação", "aprovacao", "revisão", "revisao", "review", "aprov"])) key = "blue";
  else if (match(["andamento", "doing", "progress", "execução", "execucao"])) key = "yellow";
  else if (match(["fazer", "todo", "to-do", "backlog", "planejad"])) key = "sky";
  else if (match(["bloqueado", "blocked", "impedid"])) key = "red";
  else {
    const fallback: Array<keyof typeof TRELLO_HEX> = ["purple", "pink", "orange", "lime", "sky"];
    key = fallback[Math.abs(ordem) % fallback.length];
  }

  const hex = TRELLO_HEX[key];
  const bold = TRELLO_HEX_BOLD[key];

  // Coluna opaca no estilo Trello: pastel consistente em modo claro E dark.
  // Usamos uma base clara fixa (#f1f2f4, superfície de lista do Trello) para
  // que a cor não escureça no dark, e forçamos texto escuro para manter contraste.
  const LIST_BASE = "#f1f2f4";
  const style: React.CSSProperties = {
    backgroundColor: `color-mix(in srgb, ${hex} 22%, ${LIST_BASE})`,
    borderColor: `color-mix(in srgb, ${hex} 45%, ${LIST_BASE})`,
    color: "#172b4d",
  };

  const barStyle: React.CSSProperties = { backgroundColor: bold };

  return {
    header: "",
    bar: "",
    column: "",
    style,
    barStyle,
  };
}



export type PrazoStatus = "sem-prazo" | "atrasado" | "hoje" | "em-breve" | "no-prazo" | "concluido";

export function prazoStatus(card: Pick<AtividadeCard, "dataEntrega" | "concluido">): PrazoStatus {
  if (card.concluido) return "concluido";
  if (!card.dataEntrega) return "sem-prazo";
  const now = new Date();
  const due = new Date(card.dataEntrega);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const in7 = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (due < startOfToday) return "atrasado";
  if (due < startOfTomorrow) return "hoje";
  if (due <= in7) return "em-breve";
  return "no-prazo";
}

export const PRIORIDADE_META: Record<
  Prioridade,
  { label: string; className: string; dot: string }
> = {
  baixa: { label: "Baixa", className: "text-muted-foreground", dot: "bg-slate-400" },
  media: { label: "Média", className: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  alta: { label: "Alta", className: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  urgente: { label: "Urgente", className: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
};
