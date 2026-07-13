import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface AtividadeColuna {
  id: string;
  chave: string;
  nome: string;
  ordem: number;
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
  // Trello-like fields (T1)
  dataEntrega: string | null;
  dataInicio: string | null;
  concluido: boolean;
  dataConclusao: string | null;
  coverCor: string | null;
  prioridade: Prioridade | null;
  descricaoMarkdown: boolean;
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
}

export interface AtividadeLogEntry {
  id: string;
  cardId: string;
  userId: string | null;
  userEmail: string | null;
  tipo: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const SELECT_COLS =
  "id, coluna_id, titulo, descricao, responsavel_id, responsavel_ids, responsavel_persona_ids, solucao_id, ordem, checklist, links, created_by, created_at, updated_at, data_entrega, data_inicio, concluido, data_conclusao, cover_cor, prioridade, descricao_markdown";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(r: any, labelIds: string[] = []): AtividadeCard {
  return {
    id: r.id,
    colunaId: r.coluna_id,
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
    dataInicio: r.data_inicio ?? null,
    concluido: !!r.concluido,
    dataConclusao: r.data_conclusao ?? null,
    coverCor: r.cover_cor ?? null,
    prioridade: (r.prioridade as Prioridade | null) ?? null,
    descricaoMarkdown: r.descricao_markdown !== false,
    labelIds,
  };
}

export async function listPersonas(): Promise<AtividadePersona[]> {
  const { data, error } = await sb
    .from("atividades_personas")
    .select("id, user_id, nome, ativo")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { id: string; user_id: string; nome: string; ativo: boolean }) => ({
    id: r.id,
    userId: r.user_id,
    nome: r.nome,
    ativo: r.ativo,
  }));
}

export async function listColunas(): Promise<AtividadeColuna[]> {
  const { data, error } = await sb
    .from("atividades_colunas")
    .select("id, chave, nome, ordem")
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { id: string; chave: string; nome: string; ordem: number }) => ({
    id: r.id,
    chave: r.chave,
    nome: r.nome,
    ordem: r.ordem,
  }));
}

export async function listCards(): Promise<AtividadeCard[]> {
  const [cardsRes, linksRes] = await Promise.all([
    sb.from("atividades_cards").select(SELECT_COLS).order("ordem", { ascending: true }),
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

export async function listLabels(): Promise<AtividadeLabel[]> {
  const { data, error } = await sb
    .from("atividades_labels")
    .select("id, nome, cor, ordem")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: { id: string; nome: string; cor: string; ordem: number }) => ({
    id: r.id,
    nome: r.nome,
    cor: r.cor,
    ordem: r.ordem,
  }));
}

export async function createLabel(input: { nome: string; cor: string }): Promise<AtividadeLabel> {
  const { data, error } = await sb
    .from("atividades_labels")
    .insert({ nome: input.nome, cor: input.cor })
    .select("id, nome, cor, ordem")
    .single();
  if (error) throw error;
  return { id: data.id, nome: data.nome, cor: data.cor, ordem: data.ordem };
}

export async function updateLabel(id: string, patch: { nome?: string; cor?: string }): Promise<void> {
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
  const current = new Set<string>(
    (existing ?? []).map((r: { label_id: string }) => r.label_id),
  );
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
    .select("id, card_id, user_id, user_email, tipo, payload, created_at")
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
      payload: Record<string, unknown>;
      created_at: string;
    }) => ({
      id: r.id,
      cardId: r.card_id,
      userId: r.user_id,
      userEmail: r.user_email,
      tipo: r.tipo,
      payload: r.payload ?? {},
      createdAt: r.created_at,
    }),
  );
}

export async function createCard(input: {
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
}): Promise<AtividadeCard> {
  const ids = input.responsavelIds ?? [];
  const personaIds = input.responsavelPersonaIds ?? [];
  const { data, error } = await sb
    .from("atividades_cards")
    .insert({
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
      prioridade: input.prioridade ?? null,
      cover_cor: input.coverCor ?? null,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  const labelIds = input.labelIds ?? [];
  if (labelIds.length > 0) {
    await setCardLabels(data.id, labelIds);
  }
  return mapCard(data, labelIds);
}

export async function updateCard(
  id: string,
  patch: {
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
  },
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd: any = {};
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

export interface CardComentario {
  id: string;
  cardId: string;
  userId: string | null;
  texto: string;
  createdAt: string;
  updatedAt: string;
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
  };
}

export async function listComentarios(cardId: string): Promise<CardComentario[]> {
  const { data, error } = await sb
    .from("atividades_comentarios")
    .select("id, card_id, user_id, texto, created_at, updated_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapComentario);
}

export async function createComentario(input: {
  cardId: string;
  userId: string;
  texto: string;
}): Promise<CardComentario> {
  const { data, error } = await sb
    .from("atividades_comentarios")
    .insert({
      card_id: input.cardId,
      user_id: input.userId,
      texto: input.texto,
    })
    .select("id, card_id, user_id, texto, created_at, updated_at")
    .single();
  if (error) throw error;
  return mapComentario(data);
}

export async function updateComentario(id: string, texto: string): Promise<void> {
  const { error } = await sb
    .from("atividades_comentarios")
    .update({ texto })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteComentario(id: string): Promise<void> {
  const { error } = await sb.from("atividades_comentarios").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderCards(
  updates: { id: string; colunaId: string; ordem: number }[],
): Promise<void> {
  await Promise.all(
    updates.map((u) =>
      sb
        .from("atividades_cards")
        .update({ coluna_id: u.colunaId, ordem: u.ordem })
        .eq("id", u.id),
    ),
  );
}

// ============================================================
// Helpers de UI (paleta e status de prazo)
// ============================================================

export const LABEL_COLORS: { key: string; className: string; label: string }[] = [
  { key: "green", label: "Verde", className: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" },
  { key: "yellow", label: "Amarelo", className: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40" },
  { key: "orange", label: "Laranja", className: "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40" },
  { key: "red", label: "Vermelho", className: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40" },
  { key: "purple", label: "Roxo", className: "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40" },
  { key: "blue", label: "Azul", className: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40" },
  { key: "sky", label: "Ciano", className: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/40" },
  { key: "pink", label: "Rosa", className: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/40" },
  { key: "slate", label: "Cinza", className: "bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40" },
];

export function labelColorClass(cor: string | null | undefined): string {
  return (
    LABEL_COLORS.find((c) => c.key === cor)?.className ??
    "bg-muted text-foreground border-border"
  );
}

export function coverColorClass(cor: string | null | undefined): string {
  const map: Record<string, string> = {
    green: "bg-emerald-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    sky: "bg-sky-500",
    pink: "bg-pink-500",
    slate: "bg-slate-500",
  };
  return cor ? map[cor] ?? "" : "";
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
