import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export interface AtividadeColuna {
  id: string;
  chave: string;
  nome: string;
  ordem: number;
}

export interface AtividadeCard {
  id: string;
  colunaId: string;
  titulo: string;
  descricao: string;
  responsavelId: string | null;
  solucaoId: string | null;
  ordem: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
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
    .select("id, coluna_id, titulo, descricao, responsavel_id, solucao_id, ordem, created_by, created_at, updated_at")
    .order("ordem", { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    colunaId: r.coluna_id,
    titulo: r.titulo,
    descricao: r.descricao ?? "",
    responsavelId: r.responsavel_id,
    solucaoId: r.solucao_id,
    ordem: r.ordem ?? 0,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createCard(input: {
  colunaId: string;
  titulo: string;
  descricao?: string;
  responsavelId?: string | null;
  solucaoId?: string | null;
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
      created_by: input.createdBy ?? null,
      ordem: input.ordem ?? 0,
    })
    .select("id, coluna_id, titulo, descricao, responsavel_id, solucao_id, ordem, created_by, created_at, updated_at")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    colunaId: data.coluna_id,
    titulo: data.titulo,
    descricao: data.descricao ?? "",
    responsavelId: data.responsavel_id,
    solucaoId: data.solucao_id,
    ordem: data.ordem ?? 0,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
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
  const { error } = await sb.from("atividades_cards").update(upd).eq("id", id);
  if (error) throw error;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await sb.from("atividades_cards").delete().eq("id", id);
  if (error) throw error;
}
