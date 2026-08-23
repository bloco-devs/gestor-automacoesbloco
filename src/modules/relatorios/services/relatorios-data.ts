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
}

export interface FiltrosDaConsulta {
  inicio: Date;
  fim: Date;
  sistema?: string | null;
  responsavel?: string | null;
  busca?: string | null;
}

export async function buscarImplementacoes(f: FiltrosDaConsulta): Promise<LinhaDeImplementacao[]> {
  const { data, error } = await supabase.rpc("relatorio_implementacoes" as never, {
    _inicio: f.inicio.toISOString(),
    _fim: f.fim.toISOString(),
    _sistema: f.sistema ?? null,
    _responsavel: f.responsavel ?? null,
    _busca: f.busca ?? null,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as LinhaDeImplementacao[];
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
