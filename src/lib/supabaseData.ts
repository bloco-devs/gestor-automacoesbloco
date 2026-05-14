import { supabase } from "@/integrations/supabase/client";
import { calcScore } from "@/lib/score";
import type { Frequencia, Melhoria, MelhoriaStatus, PipelineStatus, Solicitacao, Solucao } from "@/lib/types";

type SolicitacaoRow = {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: number;
  complexidade: number;
  retorno: number;
  status: string;
  score: number;
  notas_tecnicas: string | null;
  setor: string | null;
  tem_integracao: boolean;
  integracoes: string[];
  user_id: string | null;
  solicitante_nome: string;
  nome: string;
  created_at: string;
  updated_at: string;
};

function asFrequencia(value: number): Frequencia {
  return ([1, 2, 3, 4] as number[]).includes(value) ? (value as Frequencia) : 3;
}

function asStatus(value: string): PipelineStatus {
  const allowed: PipelineStatus[] = ["novo", "em_analise", "aprovado", "em_desenvolvimento", "testando", "pronto", "em_producao"];
  return allowed.includes(value as PipelineStatus) ? (value as PipelineStatus) : "novo";
}

function mapSolicitacao(row: SolicitacaoRow): Solicitacao {
  return {
    id: row.id,
    titulo: row.titulo || row.descricao.slice(0, 80) || "Solicitação",
    descricao: row.descricao,
    frequencia: asFrequencia(row.frequencia),
    complexidade: row.complexidade,
    retorno: row.retorno,
    // Campos novos (escala 0-10) — backfill real virá no Prompt 2.
    // Por enquanto, projeção temporária a partir do legado para manter os tipos válidos.
    dificuldade: row.complexidade,
    complexidadeDev: null,
    status: asStatus(row.status),
    score: row.score,
    scoreSolicitante: row.score,
    scoreFinal: null,
    notasTecnicas: row.notas_tecnicas ?? undefined,
    setor: row.setor ?? undefined,
    temIntegracao: row.tem_integracao,
    integracoes: row.integracoes ?? [],
    solicitanteId: row.user_id ?? "",
    solicitanteNome: row.solicitante_nome || row.nome || "Solicitante",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSolucao(row: { id: string; solicitacao_id: string | null; titulo: string; descricao: string; link: string | null; created_at: string }): Solucao {
  return {
    id: row.id,
    solicitacaoId: row.solicitacao_id,
    titulo: row.titulo,
    descricao: row.descricao,
    link: row.link ?? undefined,
    createdAt: row.created_at,
  };
}

function mapMelhoria(row: { id: string; solucao_id: string; descricao: string; status: string; data: string }): Melhoria {
  return {
    id: row.id,
    solucaoId: row.solucao_id,
    descricao: row.descricao,
    status: row.status as MelhoriaStatus,
    data: row.data,
  };
}

export async function listSolicitacoes(): Promise<Solicitacao[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSolicitacao(row as SolicitacaoRow));
}

export async function listMinhasSolicitacoes(userId: string): Promise<Solicitacao[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSolicitacao(row as SolicitacaoRow));
}

export async function getSolicitacao(id: string): Promise<Solicitacao | null> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSolicitacao(data as SolicitacaoRow) : null;
}

export async function createSolicitacao(data: {
  titulo: string;
  descricao: string;
  softwares: string[];
  frequencia: Frequencia;
  complexidade: number;
  retorno: number;
  setor: string;
  solicitanteId: string;
  solicitanteNome: string;
  email: string;
}): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Faça login novamente para enviar uma demanda.");
  }

  const { error } = await supabase.from("solicitacoes").insert({
    titulo: data.titulo,
    descricao: data.descricao,
    frequencia: data.frequencia,
    complexidade: data.complexidade,
    retorno: data.retorno,
    setor: data.setor,
    score: calcScore(data),
    user_id: authData.user.id,
    solicitante_nome: data.solicitanteNome,
    nome: data.solicitanteNome,
    email: data.email,
    tem_integracao: data.softwares.length > 0,
    integracoes: data.softwares,
    status: "novo",
  });
  if (error) throw error;
}

export async function updateOwnSolicitacao(
  id: string,
  data: {
    titulo: string;
    descricao: string;
    softwares: string[];
    frequencia: Frequencia;
    complexidade: number;
    retorno: number;
    setor: string;
  },
): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Faça login novamente para editar a demanda.");
  }

  const payload = {
    titulo: data.titulo,
    descricao: data.descricao,
    frequencia: data.frequencia,
    complexidade: data.complexidade,
    retorno: data.retorno,
    setor: data.setor,
    tem_integracao: data.softwares.length > 0,
    integracoes: data.softwares,
    score: calcScore(data),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("solicitacoes")
    .update(payload)
    .eq("id", id)
    .eq("user_id", authData.user.id);
  if (error) throw error;
}
export async function updateSolicitacao(id: string, patch: Partial<Solicitacao>): Promise<void> {
  const current = await getSolicitacao(id);
  const merged = { ...current, ...patch } as Solicitacao;
  const candidate: Record<string, unknown> = {
    descricao: patch.descricao,
    titulo: patch.titulo,
    complexidade: patch.complexidade,
    retorno: patch.retorno,
    status: patch.status,
    notas_tecnicas: patch.notasTecnicas,
    setor: patch.setor,
    tem_integracao: patch.temIntegracao,
    integracoes: patch.integracoes,
  };
  const payload: Record<string, unknown> = { score: calcScore(merged), updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(candidate)) {
    if (value !== undefined) payload[key] = value;
  }
  const { error } = await supabase.from("solicitacoes").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteSolicitacao(id: string): Promise<void> {
  const { error: solucoesError } = await supabase.from("demanda_solucoes").delete().eq("solicitacao_id", id);
  if (solucoesError) throw solucoesError;

  const { error } = await supabase.from("solicitacoes").delete().eq("id", id);
  if (error) throw error;
}

export async function listSolucoes(): Promise<Solucao[]> {
  const { data, error } = await supabase
    .from("demanda_solucoes")
    .select("id,solicitacao_id,titulo,descricao,link,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSolucao);
}

export async function listSolucoesBySolicitacao(solicitacaoId: string): Promise<Solucao[]> {
  const { data, error } = await supabase
    .from("demanda_solucoes")
    .select("id,solicitacao_id,titulo,descricao,link,created_at")
    .eq("solicitacao_id", solicitacaoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSolucao);
}

export async function createSolucao(data: { solicitacaoId?: string | null; titulo: string; descricao: string; link?: string | null; createdBy?: string }): Promise<void> {
  const { error } = await supabase.from("demanda_solucoes").insert({
    solicitacao_id: data.solicitacaoId ?? null,
    titulo: data.titulo,
    descricao: data.descricao,
    link: data.link ?? null,
    created_by: data.createdBy,
  });
  if (error) throw error;
}

export async function updateSolucao(id: string, patch: { titulo?: string; descricao?: string; link?: string | null }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.titulo !== undefined) payload.titulo = patch.titulo;
  if (patch.descricao !== undefined) payload.descricao = patch.descricao;
  if (patch.link !== undefined) payload.link = patch.link;
  const { error } = await supabase.from("demanda_solucoes").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteSolucao(id: string): Promise<void> {
  const { error: melhoriasError } = await supabase.from("demanda_melhorias").delete().eq("solucao_id", id);
  if (melhoriasError) throw melhoriasError;

  const { error } = await supabase.from("demanda_solucoes").delete().eq("id", id);
  if (error) throw error;
}

export async function listMelhorias(): Promise<Melhoria[]> {
  const { data, error } = await supabase.from("demanda_melhorias").select("id,solucao_id,descricao,status,data").order("data", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapMelhoria);
}

export async function createMelhoria(data: Omit<Melhoria, "id">): Promise<void> {
  const { error } = await supabase.from("demanda_melhorias").insert({
    solucao_id: data.solucaoId,
    descricao: data.descricao,
    status: data.status,
    data: data.data,
  });
  if (error) throw error;
}

export async function updateMelhoria(id: string, patch: Partial<Melhoria>): Promise<void> {
  const { error } = await supabase.from("demanda_melhorias").update({ status: patch.status, descricao: patch.descricao, data: patch.data }).eq("id", id);
  if (error) throw error;
}

export async function deleteMelhoria(id: string): Promise<void> {
  const { error } = await supabase.from("demanda_melhorias").delete().eq("id", id);
  if (error) throw error;
}

export async function submitPublicSolicitacao(data: { nome: string; email: string; telefone: string; descricao: string }): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Faça login para enviar uma solicitação.");
  }

  const { error } = await supabase.from("solicitacoes").insert({
    nome: data.nome,
    solicitante_nome: data.nome,
    email: data.email,
    telefone: data.telefone,
    user_id: authData.user.id,
    descricao: data.descricao,
    titulo: "Solicitação de solução",
    tipo: "solucao",
    status: "novo",
  });
  if (error) throw error;
}

// ===== Tasks (developer-only checklist) =====

import type { Task, Developer } from "@/lib/types";

export async function listTasks(solicitacaoId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("demanda_tasks" as never)
    .select("id,solicitacao_id,titulo,concluida,assigned_to,ordem,created_at")
    .eq("solicitacao_id", solicitacaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; solicitacao_id: string; titulo: string; concluida: boolean; assigned_to: string | null; ordem: number; created_at: string }>).map((r) => ({
    id: r.id,
    solicitacaoId: r.solicitacao_id,
    titulo: r.titulo,
    concluida: r.concluida,
    assignedTo: r.assigned_to,
    ordem: r.ordem,
    createdAt: r.created_at,
  }));
}

export async function createTask(data: { solicitacaoId: string; titulo: string; createdBy?: string }): Promise<void> {
  const { error } = await supabase.from("demanda_tasks" as never).insert({
    solicitacao_id: data.solicitacaoId,
    titulo: data.titulo,
    created_by: data.createdBy ?? null,
  } as never);
  if (error) throw error;
}

export async function updateTask(id: string, patch: { titulo?: string; concluida?: boolean; assignedTo?: string | null; ordem?: number }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.titulo !== undefined) payload.titulo = patch.titulo;
  if (patch.concluida !== undefined) payload.concluida = patch.concluida;
  if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo;
  if (patch.ordem !== undefined) payload.ordem = patch.ordem;
  const { error } = await supabase.from("demanda_tasks" as never).update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("demanda_tasks" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function listDevelopers(): Promise<Developer[]> {
  const { data, error } = await supabase
    .from("developers" as never)
    .select("id,nome,email");
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; nome: string; email: string }>).map((r) => ({
    id: r.id,
    nome: r.nome,
    email: r.email,
  }));
}

// ===== Solucao Tasks =====

import type { SolucaoTask } from "@/lib/types";

export async function listSolucaoTasks(solucaoId: string): Promise<SolucaoTask[]> {
  const { data, error } = await supabase
    .from("solucao_tasks" as never)
    .select("id,solucao_id,titulo,concluida,assigned_to,ordem,created_at")
    .eq("solucao_id", solucaoId)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; solucao_id: string; titulo: string; concluida: boolean; assigned_to: string | null; ordem: number; created_at: string }>).map((r) => ({
    id: r.id,
    solucaoId: r.solucao_id,
    titulo: r.titulo,
    concluida: r.concluida,
    assignedTo: r.assigned_to,
    ordem: r.ordem,
    createdAt: r.created_at,
  }));
}

export async function createSolucaoTask(data: { solucaoId: string; titulo: string; createdBy?: string }): Promise<void> {
  const { error } = await supabase.from("solucao_tasks" as never).insert({
    solucao_id: data.solucaoId,
    titulo: data.titulo,
    created_by: data.createdBy ?? null,
  } as never);
  if (error) throw error;
}

export async function updateSolucaoTask(id: string, patch: { titulo?: string; concluida?: boolean; assignedTo?: string | null; ordem?: number }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.titulo !== undefined) payload.titulo = patch.titulo;
  if (patch.concluida !== undefined) payload.concluida = patch.concluida;
  if (patch.assignedTo !== undefined) payload.assigned_to = patch.assignedTo;
  if (patch.ordem !== undefined) payload.ordem = patch.ordem;
  const { error } = await supabase.from("solucao_tasks" as never).update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteSolucaoTask(id: string): Promise<void> {
  const { error } = await supabase.from("solucao_tasks" as never).delete().eq("id", id);
  if (error) throw error;
}

export async function getSolucao(id: string): Promise<Solucao | null> {
  const { data, error } = await supabase
    .from("demanda_solucoes")
    .select("id,solicitacao_id,titulo,descricao,link,created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSolucao(data) : null;
}

