import { supabase } from "@/integrations/supabase/client";

// As tabelas abaixo foram criadas fora do fluxo de tipos gerados; usamos um
// cliente sem tipagem estrita para não travar o build.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

// ---------- Etiquetas ----------

export interface Etiqueta {
  id: string;
  boardId: string | null;
  nome: string | null;
  cor: string;
}

export async function listEtiquetas(boardId: string): Promise<Etiqueta[]> {
  const { data, error } = await sb
    .from("atividades_etiquetas")
    .select("id, board_id, nome, cor")
    .eq("board_id", boardId)
    .order("nome", { ascending: true });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    boardId: r.board_id,
    nome: r.nome,
    cor: r.cor,
  }));
}

export async function createEtiqueta(input: {
  boardId: string;
  nome: string;
  cor: string;
}): Promise<Etiqueta> {
  const { data, error } = await sb
    .from("atividades_etiquetas")
    .insert({ board_id: input.boardId, nome: input.nome, cor: input.cor })
    .select("id, board_id, nome, cor")
    .single();
  if (error) throw error;
  return { id: data.id, boardId: data.board_id, nome: data.nome, cor: data.cor };
}

export async function deleteEtiqueta(id: string): Promise<void> {
  const { error } = await sb.from("atividades_etiquetas").delete().eq("id", id);
  if (error) throw error;
}

export async function listEtiquetasDoCard(cardId: string): Promise<string[]> {
  const { data, error } = await sb
    .from("atividades_card_etiquetas")
    .select("etiqueta_id")
    .eq("card_id", cardId);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r.etiqueta_id as string);
}

export async function vincularEtiqueta(cardId: string, etiquetaId: string): Promise<void> {
  const { error } = await sb
    .from("atividades_card_etiquetas")
    .insert({ card_id: cardId, etiqueta_id: etiquetaId });
  if (error) throw error;
}

export async function desvincularEtiqueta(cardId: string, etiquetaId: string): Promise<void> {
  const { error } = await sb
    .from("atividades_card_etiquetas")
    .delete()
    .eq("card_id", cardId)
    .eq("etiqueta_id", etiquetaId);
  if (error) throw error;
}

// ---------- Checklists ----------

export interface ChecklistItemRow {
  id: string;
  checklistId: string;
  nome: string;
  concluido: boolean;
  ordem: number;
}

export interface ChecklistRow {
  id: string;
  cardId: string;
  titulo: string;
  ordem: number;
  itens: ChecklistItemRow[];
}

export async function listChecklists(cardId: string): Promise<ChecklistRow[]> {
  const { data: listas, error } = await sb
    .from("atividades_checklists")
    .select("id, card_id, titulo, ordem")
    .eq("card_id", cardId)
    .order("ordem", { ascending: true });
  if (error) throw error;
  const ids = (listas ?? []).map((l: { id: string }) => l.id);
  let itens: ChecklistItemRow[] = [];
  if (ids.length > 0) {
    const { data: rows, error: e2 } = await sb
      .from("atividades_checklist_items")
      .select("id, checklist_id, nome, concluido, ordem")
      .in("checklist_id", ids)
      .order("ordem", { ascending: true });
    if (e2) throw e2;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    itens = (rows ?? []).map((r: any) => ({
      id: r.id,
      checklistId: r.checklist_id,
      nome: r.nome,
      concluido: !!r.concluido,
      ordem: r.ordem ?? 0,
    }));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (listas ?? []).map((l: any) => ({
    id: l.id,
    cardId: l.card_id,
    titulo: l.titulo,
    ordem: l.ordem ?? 0,
    itens: itens.filter((i) => i.checklistId === l.id),
  }));
}

export async function createChecklist(input: {
  cardId: string;
  titulo: string;
  ordem?: number;
}): Promise<string> {
  const { data, error } = await sb
    .from("atividades_checklists")
    .insert({ card_id: input.cardId, titulo: input.titulo, ordem: input.ordem ?? 0 })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteChecklist(id: string): Promise<void> {
  const { error } = await sb.from("atividades_checklists").delete().eq("id", id);
  if (error) throw error;
}

export async function createChecklistItem(input: {
  checklistId: string;
  nome: string;
  ordem?: number;
}): Promise<void> {
  const { error } = await sb.from("atividades_checklist_items").insert({
    checklist_id: input.checklistId,
    nome: input.nome,
    concluido: false,
    ordem: input.ordem ?? 0,
  });
  if (error) throw error;
}

export async function toggleChecklistItem(id: string, concluido: boolean): Promise<void> {
  const { error } = await sb
    .from("atividades_checklist_items")
    .update({ concluido })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await sb.from("atividades_checklist_items").delete().eq("id", id);
  if (error) throw error;
}
