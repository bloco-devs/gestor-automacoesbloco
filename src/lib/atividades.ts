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

export interface AtividadeCard {
  id: string;
  colunaId: string;
  titulo: string;
  descricao: string;
  responsavelId: string | null;
  responsavelIds: string[];
  solucaoId: string | null;
  ordem: number;
  checklist: ChecklistItem[];
  links: CardLink[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const SELECT_COLS =
  "id, coluna_id, titulo, descricao, responsavel_id, responsavel_ids, solucao_id, ordem, checklist, links, created_by, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(r: any): AtividadeCard {
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
    solucaoId: r.solucao_id,

    ordem: r.ordem ?? 0,
    checklist: Array.isArray(r.checklist) ? r.checklist : [],
    links: Array.isArray(r.links) ? r.links : [],
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
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
  const { data, error } = await sb
    .from("atividades_cards")
    .select(SELECT_COLS)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapCard);
}

export async function createCard(input: {
  colunaId: string;
  titulo: string;
  descricao?: string;
  responsavelId?: string | null;
  solucaoId?: string | null;
  checklist?: ChecklistItem[];
  links?: CardLink[];
  createdBy?: string | null;
  ordem?: number;
}): Promise<AtividadeCard> {
  const { data, error } = await sb
    .from("atividades_cards")
    .insert({
      coluna_id: input.colunaId,
      titulo: input.titulo,
      descricao: input.descricao ?? "",
      responsavel_id: input.responsavelId ?? null,
      solucao_id: input.solucaoId ?? null,
      checklist: input.checklist ?? [],
      links: input.links ?? [],
      created_by: input.createdBy ?? null,
      ordem: input.ordem ?? 0,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return mapCard(data);
}

export async function updateCard(
  id: string,
  patch: {
    titulo?: string;
    descricao?: string;
    responsavelId?: string | null;
    solucaoId?: string | null;
    colunaId?: string;
    ordem?: number;
    checklist?: ChecklistItem[];
    links?: CardLink[];
  },
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd: any = {};
  if (patch.titulo !== undefined) upd.titulo = patch.titulo;
  if (patch.descricao !== undefined) upd.descricao = patch.descricao;
  if (patch.responsavelId !== undefined) upd.responsavel_id = patch.responsavelId;
  if (patch.solucaoId !== undefined) upd.solucao_id = patch.solucaoId;
  if (patch.colunaId !== undefined) upd.coluna_id = patch.colunaId;
  if (patch.ordem !== undefined) upd.ordem = patch.ordem;
  if (patch.checklist !== undefined) upd.checklist = patch.checklist;
  if (patch.links !== undefined) upd.links = patch.links;
  const { error } = await sb.from("atividades_cards").update(upd).eq("id", id);
  if (error) throw error;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await sb.from("atividades_cards").delete().eq("id", id);
  if (error) throw error;
}
