import { supabase } from "@/integrations/supabase/client";
import { calcScore } from "@/lib/score";
import { computeScoreFinal, computeScoreSolicitante } from "@/lib/scoreV2";
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
  notas_tecnicas_complexidade: string | null;
  setor: string | null;
  tem_integracao: boolean;
  integracoes: string[];
  user_id: string | null;
  solicitante_nome: string;
  nome: string;
  created_at: string;
  updated_at: string;
  complexidade_dev: number | null;
};

function asFrequencia(value: number): Frequencia {
  // Aceita escala legada (1-4) e a nova (0-10). O backfill no Prompt 4
  // unifica os dois universos no banco.
  const n = Number(value);
  if (Number.isNaN(n)) return 3;
  return Math.max(0, Math.min(10, n));
}

function asStatus(value: string): PipelineStatus {
  const allowed: PipelineStatus[] = ["novo", "em_analise", "aprovado", "em_desenvolvimento", "testando", "pronto", "em_producao"];
  return allowed.includes(value as PipelineStatus) ? (value as PipelineStatus) : "novo";
}

function mapSolicitacao(row: SolicitacaoRow): Solicitacao {
  // scoreV2 espelha a futura função SQL compute_scores(); migrar para RPC após o trigger.
  const dificuldade = row.complexidade; // TODO Prompt 2: usar coluna `dificuldade` própria após backfill
  const scoreSolicitante = computeScoreSolicitante(row.frequencia, dificuldade, row.retorno);
  const scoreFinal = computeScoreFinal(scoreSolicitante, row.complexidade_dev);
  return {
    id: row.id,
    titulo: row.titulo || row.descricao.slice(0, 80) || "Solicitação",
    descricao: row.descricao,
    frequencia: asFrequencia(row.frequencia),
    complexidade: row.complexidade,
    retorno: row.retorno,
    dificuldade,
    complexidadeDev: row.complexidade_dev,
    status: asStatus(row.status),
    score: row.score,
    scoreSolicitante,
    scoreFinal,
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
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at,complexidade_dev")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSolicitacao(row as SolicitacaoRow));
}

export async function listMinhasSolicitacoes(userId: string): Promise<Solicitacao[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at,complexidade_dev")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapSolicitacao(row as SolicitacaoRow));
}

export async function getSolicitacao(id: string): Promise<Solicitacao | null> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at,complexidade_dev")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSolicitacao(data as SolicitacaoRow) : null;
}

/**
 * Cria uma nova solicitação na escala unificada 0-10.
 *
 * IMPORTANTE: o cálculo de `score_solicitante` / `score_final` será feito por
 * trigger SQL (`compute_scores()`) a partir do Prompt 5. Enquanto o trigger não
 * existir, espelhamos a fórmula localmente via `scoreV2` e gravamos o `score`
 * legado para manter os componentes antigos funcionando. Após o trigger:
 *   - remover a coluna `score` da insert
 *   - remover a chamada local a `computeScoreSolicitante`
 *   - confiar 100% no valor devolvido pelo `.select()` pós-insert.
 */
export async function createSolicitacao(data: {
  titulo: string;
  descricao: string;
  softwares: string[];
  frequencia: number; // 0-10
  dificuldade: number; // 0-10 — substitui semanticamente "complexidade"
  retorno: number; // 0-10
  setor: string;
  solicitanteId: string;
  solicitanteNome: string;
  email: string;
}): Promise<Solicitacao> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Faça login novamente para enviar uma demanda.");
  }

  // Espelho local — remover quando o trigger SQL existir.
  const scoreSolicitanteLocal = computeScoreSolicitante(data.frequencia, data.dificuldade, data.retorno);

  const { data: inserted, error } = await supabase
    .from("solicitacoes")
    .insert({
      titulo: data.titulo,
      descricao: data.descricao,
      frequencia: data.frequencia,
      // `dificuldade` ainda é gravada na coluna `complexidade` até a migration do Prompt 5.
      complexidade: data.dificuldade,
      retorno: data.retorno,
      setor: data.setor,
      score: Math.round(scoreSolicitanteLocal),
      user_id: authData.user.id,
      solicitante_nome: data.solicitanteNome,
      nome: data.solicitanteNome,
      email: data.email,
      tem_integracao: data.softwares.length > 0,
      integracoes: data.softwares,
      status: "novo",
    })
    .select("id,titulo,descricao,frequencia,complexidade,retorno,status,score,notas_tecnicas,setor,tem_integracao,integracoes,user_id,solicitante_nome,nome,created_at,updated_at,complexidade_dev")
    .single();
  if (error) throw error;
  return mapSolicitacao(inserted as SolicitacaoRow);
}

export async function updateOwnSolicitacao(
  id: string,
  data: {
    titulo: string;
    descricao: string;
    softwares: string[];
    frequencia: Frequencia;
    complexidade: number; // 0-10 (recebido como `dificuldade` na UI nova)
    retorno: number; // 0-10
    setor: string;
  },
): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error("Faça login novamente para editar a demanda.");
  }

  // Espelho local do score — substituído por trigger SQL no Prompt 5.
  const scoreLocal = Math.round(
    computeScoreSolicitante(data.frequencia, data.complexidade, data.retorno),
  );

  const payload = {
    titulo: data.titulo,
    descricao: data.descricao,
    frequencia: data.frequencia,
    complexidade: data.complexidade,
    retorno: data.retorno,
    setor: data.setor,
    tem_integracao: data.softwares.length > 0,
    integracoes: data.softwares,
    score: scoreLocal,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("solicitacoes")
    .update(payload)
    .eq("id", id)
    .eq("user_id", authData.user.id);
  if (error) throw error;
}

/**
 * Atualiza campos arbitrários da solicitação (uso do dev, ou setores admin).
 * Quando o trigger SQL do Prompt 5 estiver ativo, os campos `score`,
 * `score_solicitante` e `score_final` deixam de ser gravados aqui — o banco
 * recalcula automaticamente a partir dos fatores.
 */
export async function updateSolicitacao(
  id: string,
  patch: Partial<Solicitacao>,
): Promise<Solicitacao | null> {
  const current = await getSolicitacao(id);
  const merged = { ...current, ...patch } as Solicitacao;
  const candidate: Record<string, unknown> = {
    descricao: patch.descricao,
    titulo: patch.titulo,
    complexidade: patch.complexidade ?? patch.dificuldade,
    retorno: patch.retorno,
    status: patch.status,
    notas_tecnicas: patch.notasTecnicas,
    setor: patch.setor,
    tem_integracao: patch.temIntegracao,
    integracoes: patch.integracoes,
    complexidade_dev: patch.complexidadeDev,
  };
  // Score legado recalculado localmente — substituído pelo trigger SQL no Prompt 5.
  const payload: Record<string, unknown> = {
    score: Math.round(
      computeScoreSolicitante(
        merged.frequencia,
        merged.dificuldade ?? merged.complexidade,
        merged.retorno,
      ),
    ),
    updated_at: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(candidate)) {
    if (value !== undefined) payload[key] = value;
  }
  const { error } = await supabase.from("solicitacoes").update(payload as never).eq("id", id);
  if (error) throw error;
  return await getSolicitacao(id);
}

/**
 * Busca uma solicitação com TODOS os campos relevantes para a nova UI de score
 * (frequência, dificuldade, retorno, complexidade técnica do dev e os dois scores).
 *
 * Hoje é apenas um alias de `getSolicitacao` — após o Prompt 5 (migration que cria
 * as colunas `dificuldade`, `score_solicitante`, `score_final`), esta função passa
 * a selecionar esses campos diretamente do banco em vez de derivá-los no client.
 */
export async function fetchSolicitacaoCompleta(id: string): Promise<Solicitacao | null> {
  return getSolicitacao(id);
}

/**
 * Valor canônico de prioridade para ordenação de listas/Kanban:
 *   COALESCE(score_final, score_solicitante, score legado, 0)
 * Garante compatibilidade enquanto o backend ainda não populou os novos campos.
 */
export function prioridadeAtual(s: Pick<Solicitacao, "scoreFinal" | "scoreSolicitante" | "score">): number {
  if (s.scoreFinal !== null && s.scoreFinal !== undefined) return s.scoreFinal;
  if (typeof s.scoreSolicitante === "number") return s.scoreSolicitante;
  return s.score ?? 0;
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

