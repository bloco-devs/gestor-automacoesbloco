import { supabase } from "@/integrations/supabase/client";

export interface DiagramaPosicao {
  solucaoId: string;
  x: number;
  y: number;
}

export interface DiagramaConexao {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string | null;
  curvX?: number | null;
  curvY?: number | null;
}


export async function listPosicoes(): Promise<DiagramaPosicao[]> {
  const { data, error } = await supabase
    .from("solucao_diagrama_posicoes")
    .select("solucao_id, x, y");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    solucaoId: r.solucao_id as string,
    x: Number(r.x),
    y: Number(r.y),
  }));
}

export async function upsertPosicao(
  solucaoId: string,
  x: number,
  y: number,
  userId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("solucao_diagrama_posicoes")
    .upsert(
      { solucao_id: solucaoId, x, y, updated_by: userId ?? null },
      { onConflict: "solucao_id" },
    );
  if (error) throw error;
}

export async function listConexoes(): Promise<DiagramaConexao[]> {
  const { data, error } = await supabase
    .from("solucao_diagrama_conexoes")
    .select("id, source_id, target_id, label");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    sourceId: r.source_id as string,
    targetId: r.target_id as string,
    label: r.label as string | null,
  }));
}

export async function createConexao(
  sourceId: string,
  targetId: string,
  userId?: string | null,
): Promise<DiagramaConexao | null> {
  const { data, error } = await supabase
    .from("solucao_diagrama_conexoes")
    .insert({ source_id: sourceId, target_id: targetId, created_by: userId ?? null })
    .select("id, source_id, target_id, label")
    .single();
  if (error) {
    // duplicate or self-loop — ignore silently
    if ((error as { code?: string }).code === "23505" || (error as { code?: string }).code === "23514") return null;
    throw error;
  }
  return {
    id: data.id as string,
    sourceId: data.source_id as string,
    targetId: data.target_id as string,
    label: data.label as string | null,
  };
}

export async function deleteConexao(id: string): Promise<void> {
  const { error } = await supabase.from("solucao_diagrama_conexoes").delete().eq("id", id);
  if (error) throw error;
}

export async function updateConexaoLabel(id: string, label: string | null): Promise<void> {
  const { error } = await supabase
    .from("solucao_diagrama_conexoes")
    .update({ label: label && label.trim() ? label.trim() : null })
    .eq("id", id);
  if (error) throw error;
}

export const TIPOS_DADO = [
  "INT",
  "BIGINT",
  "SMALLINT",
  "DECIMAL",
  "NUMERIC",
  "FLOAT",
  "DOUBLE",
  "VARCHAR",
  "TEXT",
  "CHAR",
  "BOOLEAN",
  "DATE",
  "TIME",
  "TIMESTAMP",
  "JSON",
  "JSONB",
  "UUID",
  "BLOB",
] as const;

export type TipoDado = (typeof TIPOS_DADO)[number];

export interface DiagramaConexaoColuna {
  id: string;
  conexaoId: string;
  nome: string;
  tipo: string;
  ordem: number;
}

export async function listColunas(conexaoId: string): Promise<DiagramaConexaoColuna[]> {
  const { data, error } = await supabase
    .from("solucao_diagrama_conexao_colunas")
    .select("id, conexao_id, nome, tipo, ordem")
    .eq("conexao_id", conexaoId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    conexaoId: r.conexao_id as string,
    nome: r.nome as string,
    tipo: r.tipo as string,
    ordem: Number(r.ordem),
  }));
}

export async function createColuna(
  conexaoId: string,
  nome: string,
  tipo: string,
  ordem: number,
  userId?: string | null,
): Promise<DiagramaConexaoColuna> {
  const { data, error } = await supabase
    .from("solucao_diagrama_conexao_colunas")
    .insert({ conexao_id: conexaoId, nome, tipo, ordem, created_by: userId ?? null })
    .select("id, conexao_id, nome, tipo, ordem")
    .single();
  if (error) throw error;
  return {
    id: data.id as string,
    conexaoId: data.conexao_id as string,
    nome: data.nome as string,
    tipo: data.tipo as string,
    ordem: Number(data.ordem),
  };
}

export async function updateColuna(
  id: string,
  patch: { nome?: string; tipo?: string; ordem?: number },
): Promise<void> {
  const { error } = await supabase
    .from("solucao_diagrama_conexao_colunas")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteColuna(id: string): Promise<void> {
  const { error } = await supabase
    .from("solucao_diagrama_conexao_colunas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

