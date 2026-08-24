/**
 * Acesso a dados do módulo de relatórios.
 *
 * Tudo passa por funções do banco (`rpc`), nunca por `select` direto nas
 * tabelas. Não é preciosismo: a política de leitura de `demands` é por dono,
 * então um `select` comum devolveria ZERO linhas para a pessoa do RH — sem
 * erro nenhum, só uma tela vazia. As funções rodam com privilégio e conferem
 * a permissão por dentro.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Ciclo, Faixa, TipoDeClassificacao } from "../types";

// ---------------------------------------------------------------------------
// Relatório técnico
// ---------------------------------------------------------------------------

export interface LinhaDeImplementacao {
  demanda_id: string;
  ticket_code: string;
  titulo: string;
  descricao: string | null;
  sistema_slug: string | null;
  tipo: string;
  prioridade: string;
  complexidade: string;
  status: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  responsavel_email: string | null;
  solicitante_id: string | null;
  solicitante_nome: string | null;
  solicitante_email: string | null;
  criada_em: string;
  concluida_em: string | null;
  procedencia: string;
  evidencia: string | null;
  tarefas_total: number;
  tarefas_feitas: number;
  comentarios: number;
  anexos: number;
  /** 'sem_registro' | 'rascunho' | 'concluido' */
  fechamento: string;
  /** Nulo enquanto ninguém classificou — e nulo não é zero. */
  classificacao: string | null;
  classificacao_rotulo: string | null;
  pontos: number | null;
  justificativa: string | null;
  classificada_por: string | null;
  classificada_em: string | null;
  minutos_lancados: number;
  ciclo_rotulo: string | null;
  autoclassificada?: boolean;

  /**
   * O RELATO TÉCNICO.
   *
   * Faltava justamente isto: a RPC devolvia `fechamento` — o estado — e nunca
   * o texto. Então mesmo a demanda com relato completo aparecia no relatório
   * sem uma linha sobre o que foi feito, porque o dado não chegava na tela.
   *
   * Continua nulo enquanto ninguém preencher, e `fechamento` é o que separa
   * "ninguém escreveu" de "escreveu e deixou este campo em branco".
   *
   * Nota interna nunca entra aqui — o RH tem `relatorios.ver` e lê esta
   * consulta. O que aparece é o que alguém redigiu como relato oficial.
   */
  fechamento_solicitado: string | null;
  fechamento_problema: string | null;
  fechamento_solucao: string | null;
  fechamento_alterado: string | null;
  fechamento_resultado: string | null;
  fechamento_testes: string | null;
  fechamento_banco: string | null;
  fechamento_seguranca: string | null;
  fechamento_integracoes: string | null;
  fechamento_funcionalidades: string | null;
  fechamento_observacoes: string | null;
  fechamento_sistemas: string[] | null;
  fechamento_evidencias: string[] | null;
  fechamento_por: string | null;
  fechamento_em: string | null;
}

export interface FiltrosDaConsulta {
  inicio: Date;
  fim: Date;
  sistema?: string | null;
  responsavel?: string | null;
  busca?: string | null;
  classificacao?: string | null;
  /** 'todos' | 'registrado' | 'pendente' */
  fechamento?: string | null;
}

export async function buscarImplementacoes(f: FiltrosDaConsulta): Promise<LinhaDeImplementacao[]> {
  const { data, error } = await supabase.rpc("relatorio_implementacoes" as never, {
    _inicio: f.inicio.toISOString(),
    _fim: f.fim.toISOString(),
    _sistema: f.sistema ?? null,
    _responsavel: f.responsavel ?? null,
    _busca: f.busca ?? null,
    _classificacao: f.classificacao ?? null,
    _fechamento: f.fechamento ?? null,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaDeImplementacao[];
}

// ---------------------------------------------------------------------------
// Apuração do ciclo
// ---------------------------------------------------------------------------

export interface LinhaDaApuracao {
  pessoa_id: string;
  pessoa_nome: string | null;
  pessoa_email: string | null;
  entregas: number;
  classificadas: number;
  sem_classificacao: number;
  sem_fechamento: number;
  facil: number;
  media: number;
  dificil: number;
  pontos: number;
}

/**
 * Resumo por pessoa de um ciclo. Devolve PONTOS, não reais — a conversão
 * depende da faixa, e a faixa tem lacuna declarada entre 100,01% e 119,99%.
 * Quem resolve isso é a tela, dizendo "Faixa de remuneração não definida".
 */
export async function buscarApuracao(cicloId: string): Promise<LinhaDaApuracao[]> {
  const { data, error } = await supabase.rpc("relatorio_apuracao_do_ciclo" as never, {
    _ciclo_id: cicloId,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaDaApuracao[];
}

export interface OpcaoDeFiltro {
  tipo: "sistema" | "responsavel";
  valor: string;
  rotulo: string;
  quantidade: number;
}

export async function buscarOpcoesDeFiltro(inicio: Date, fim: Date): Promise<OpcaoDeFiltro[]> {
  const { data, error } = await supabase.rpc("relatorio_filtros" as never, {
    _inicio: inicio.toISOString(),
    _fim: fim.toISOString(),
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as OpcaoDeFiltro[];
}

// ---------------------------------------------------------------------------
// Configuração — escala, faixas, ciclos
// ---------------------------------------------------------------------------

export async function buscarTiposDeClassificacao(): Promise<TipoDeClassificacao[]> {
  const { data, error } = await supabase
    .from("relatorio_classificacao_tipo" as never)
    .select("codigo, rotulo, pontos, ordem, ativo")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw error;
  return (data ?? []) as unknown as TipoDeClassificacao[];
}

export async function buscarFaixas(): Promise<Faixa[]> {
  const { data, error } = await supabase
    .from("relatorio_faixa" as never)
    .select("id, rotulo, percentual_min, percentual_max, valor_reais")
    .eq("ativo", true)
    .is("vigencia_fim", null)
    .order("percentual_min");
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((f) => ({
    id: String(f.id),
    rotulo: (f.rotulo as string | null) ?? null,
    percentualMin: Number(f.percentual_min),
    percentualMax: f.percentual_max === null ? null : Number(f.percentual_max),
    // Number(null) é 0, e aqui a diferença entre "nulo" e "zero" é a diferença
    // entre "o RH não definiu" e "não paga nada". Nunca coagir.
    valorReais: f.valor_reais === null ? null : Number(f.valor_reais),
  }));
}

export async function buscarCiclos(): Promise<Ciclo[]> {
  const { data, error } = await supabase
    .from("relatorio_ciclo" as never)
    .select("id, rotulo, referencia, inicio, fim, meta_pontos, situacao")
    .order("referencia", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id),
    rotulo: String(c.rotulo),
    referencia: String(c.referencia),
    inicio: String(c.inicio),
    fim: String(c.fim),
    metaPontos: Number(c.meta_pontos),
    situacao: c.situacao as Ciclo["situacao"],
  }));
}

// ---------------------------------------------------------------------------
// Capacidades do usuário logado
// ---------------------------------------------------------------------------

/**
 * O que ESTA pessoa pode fazer. A política da tabela já limita cada um às
 * próprias linhas, então não é preciso filtrar por id aqui.
 */
export async function buscarMinhasCapacidades(): Promise<string[]> {
  const { data, error } = await supabase
    .from("relatorio_capacidade" as never)
    .select("capacidade");
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ capacidade: string }>).map((c) => c.capacidade);
}
