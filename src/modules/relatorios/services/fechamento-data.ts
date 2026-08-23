/**
 * Fechamento técnico, tempo e classificação.
 *
 * As leituras de fila passam por função do banco, pelo mesmo motivo do
 * relatório: a política de `demands` é por dono. O fechamento em si é tabela
 * comum, porque quem escreve é a equipe e a política já cobre isso.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Fila de pendências
// ---------------------------------------------------------------------------

export interface Pendencia {
  demanda_id: string;
  ticket_code: string;
  titulo: string;
  sistema_slug: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  concluida_em: string;
  dias_parada: number;
  situacao: "sem_registro" | "rascunho" | "concluido";
  minutos_lancados: number;
  no_ciclo_aberto: boolean;
}

export async function buscarPendencias(pessoa?: string | null): Promise<Pendencia[]> {
  const { data, error } = await supabase.rpc("relatorio_pendencias_de_fechamento" as never, {
    _pessoa: pessoa ?? null,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as Pendencia[];
}

// ---------------------------------------------------------------------------
// O fechamento técnico
// ---------------------------------------------------------------------------

export interface FechamentoTecnico {
  demanda_id: string;
  o_que_foi_solicitado: string | null;
  problema_identificado: string | null;
  solucao_implementada: string | null;
  o_que_foi_alterado: string | null;
  sistemas_afetados: string[];
  funcionalidades_implementadas: string | null;
  integracoes_realizadas: string | null;
  banco_alterado: string | null;
  seguranca_rls: string | null;
  testes_realizados: string | null;
  resultado_obtido: string | null;
  observacoes: string | null;
  evidencias_links: string[];
  data_inicio: string | null;
  data_conclusao_declarada: string | null;
  situacao: "rascunho" | "concluido";
  preenchido_por_email: string | null;
  updated_at: string;
}

export async function buscarFechamento(demandaId: string): Promise<FechamentoTecnico | null> {
  const { data, error } = await supabase
    .from("relatorio_fechamento_tecnico" as never)
    .select("*")
    .eq("demanda_id", demandaId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as FechamentoTecnico) ?? null;
}

export type RascunhoDeFechamento = Partial<Omit<FechamentoTecnico, "demanda_id" | "updated_at">>;

export async function salvarFechamento(
  demandaId: string,
  campos: RascunhoDeFechamento,
): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;

  const { error } = await supabase
    .from("relatorio_fechamento_tecnico" as never)
    .upsert(
      {
        demanda_id: demandaId,
        ...campos,
        preenchido_por: uid ?? null,
        preenchido_por_email: userRes.user?.email ?? null,
      } as never,
      { onConflict: "demanda_id" },
    );

  // A constraint que exige problema/solução/alterações/resultado ao concluir
  // volta como erro do banco. Traduzir aqui, porque a mensagem crua do
  // Postgres cita o nome da constraint e não ajuda ninguém.
  if (error) {
    if (error.message.includes("rft_concluido_exige_essencial")) {
      throw new Error(
        "Para marcar como concluído, preencha: problema identificado, solução implementada, o que foi alterado e resultado obtido.",
      );
    }
    if (error.message.includes("rft_datas_coerentes")) {
      throw new Error("A data de conclusão não pode ser anterior à data de início.");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Intervalos de tempo
// ---------------------------------------------------------------------------

export interface Intervalo {
  id: string;
  demanda_id: string;
  pessoa_id: string;
  inicio: string;
  fim: string;
  observacao: string | null;
}

export async function buscarIntervalos(demandaId: string): Promise<Intervalo[]> {
  const { data, error } = await supabase
    .from("relatorio_intervalo" as never)
    .select("id, demanda_id, pessoa_id, inicio, fim, observacao")
    .eq("demanda_id", demandaId)
    .order("inicio", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Intervalo[];
}

export async function adicionarIntervalo(
  demandaId: string,
  inicio: Date,
  fim: Date,
  observacao?: string,
): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Usuário não autenticado.");

  // Validação de data futura vive aqui, e não em constraint: `now()` dentro de
  // CHECK quebra restauração de backup.
  if (inicio.getTime() > Date.now() + 86_400_000) {
    throw new Error("A data de início não pode estar no futuro.");
  }

  const { error } = await supabase.from("relatorio_intervalo" as never).insert({
    demanda_id: demandaId,
    pessoa_id: uid,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    observacao: observacao?.trim() || null,
    registrado_por: uid,
  } as never);

  if (error) {
    if (error.message.includes("ri_ordem_das_pontas")) {
      throw new Error("O fim precisa ser depois do início.");
    }
    if (error.message.includes("ri_duracao_plausivel")) {
      throw new Error("Intervalo maior que 16 horas. Confira as datas — provavelmente é engano.");
    }
    throw error;
  }
}

export async function removerIntervalo(id: string): Promise<void> {
  const { error } = await supabase.from("relatorio_intervalo" as never).delete().eq("id", id);
  if (error) throw error;
}

/** Soma em minutos. Só apresentação — nada deriva classificação disto. */
export function somarMinutos(intervalos: Intervalo[]): number {
  return intervalos.reduce(
    (s, i) => s + (new Date(i.fim).getTime() - new Date(i.inicio).getTime()) / 60000,
    0,
  );
}

export function formatarDuracao(minutos: number): string {
  if (minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ---------------------------------------------------------------------------
// Classificação
// ---------------------------------------------------------------------------

export interface ParaClassificar {
  demanda_id: string;
  ticket_code: string;
  titulo: string;
  sistema_slug: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  concluida_em: string;
  minutos_lancados: number;
  problema: string | null;
  solucao: string | null;
  alterado: string | null;
  resultado: string | null;
  testes: string | null;
  tarefas_feitas: number;
  tarefas_total: number;
  anexos: number;
  ja_classificada: boolean;
}

export async function buscarParaClassificar(): Promise<ParaClassificar[]> {
  const { data, error } = await supabase.rpc(
    "relatorio_pendencias_de_classificacao" as never,
    {} as never,
  );
  if (error) throw error;
  return (data ?? []) as unknown as ParaClassificar[];
}

export async function classificar(
  demandaId: string,
  classificacao: string,
  justificativa: string,
  motivo?: string,
): Promise<void> {
  const { error } = await supabase.rpc("relatorio_classificar" as never, {
    _demanda_id: demandaId,
    _classificacao: classificacao,
    _justificativa: justificativa,
    _motivo: motivo ?? null,
  } as never);
  // As mensagens da RPC já são escritas para quem lê — não traduzir de novo.
  if (error) throw new Error(error.message);
}

export interface EventoDeClassificacao {
  id: string;
  origem: "definicao" | "alteracao";
  classificacao_de: string | null;
  classificacao_para: string;
  pontos_de: number | null;
  pontos_para: number;
  justificativa: string;
  motivo_da_alteracao: string | null;
  alterado_por_email: string | null;
  alterado_em: string;
}

export async function buscarHistoricoDeClassificacao(
  demandaId: string,
): Promise<EventoDeClassificacao[]> {
  const { data, error } = await supabase
    .from("relatorio_classificacao_historico" as never)
    .select(
      "id, origem, classificacao_de, classificacao_para, pontos_de, pontos_para, justificativa, motivo_da_alteracao, alterado_por_email, alterado_em",
    )
    .eq("demanda_id", demandaId)
    .order("alterado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EventoDeClassificacao[];
}
