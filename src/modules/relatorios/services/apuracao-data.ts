/**
 * Apuração do ciclo.
 *
 * REGRA DESTE ARQUIVO: nada aqui calcula valor em reais.
 *
 * O percentual, a faixa e o R$ vêm prontos de `relatorio_resultado_do_ciclo`.
 * Derivar dinheiro na tela seria impossível de auditar depois — bastaria um
 * `?? 0` num lugar errado para "faixa não definida" virar "R$ 0,00", que é
 * precisamente o número inventado que este módulo não pode produzir.
 *
 * A função `resolverFaixa` do serviço de relatórios continua existindo, mas só
 * para os testes: ela espelha a lógica do banco para poder ser exercitada sem
 * Postgres. A tela não a usa.
 */

import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// Resultado do ciclo
// ---------------------------------------------------------------------------

export interface ResultadoDoCiclo {
  ciclo_rotulo: string;
  inicio: string;
  fim: string;
  situacao: "aberto" | "em_analise" | "fechado" | "aprovado";
  /** Verdadeiro quando os números vêm do snapshot, não de consulta ao vivo. */
  congelado: boolean;
  meta_pontos: number;
  pontos: number;
  percentual: number | null;
  entregas: number;
  facil: number;
  media: number;
  dificil: number;
  faixa_rotulo: string | null;
  /** NULO quando o RH não definiu quanto vale. Nunca coagir para 0. */
  valor_reais: number | null;
  faixa_indefinida: boolean;
  mensagem: string;
}

export async function buscarResultadoDoCiclo(cicloId: string): Promise<ResultadoDoCiclo | null> {
  const { data, error } = await supabase.rpc("relatorio_resultado_do_ciclo" as never, {
    _ciclo_id: cicloId,
  } as never);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as unknown as ResultadoDoCiclo[];
  return linhas[0] ?? null;
}

// ---------------------------------------------------------------------------
// Pendências
// ---------------------------------------------------------------------------

export interface PendenciasDoCiclo {
  concluidas_no_ciclo: number;
  elegiveis: number;
  sem_fechamento: number;
  sem_classificacao: number;
  sem_data_confiavel: number;
}

export async function buscarPendenciasDoCiclo(cicloId: string): Promise<PendenciasDoCiclo | null> {
  const { data, error } = await supabase.rpc("relatorio_pendencias_do_ciclo" as never, {
    _ciclo_id: cicloId,
  } as never);
  if (error) throw new Error(error.message);
  const linhas = (data ?? []) as unknown as PendenciasDoCiclo[];
  return linhas[0] ?? null;
}

// ---------------------------------------------------------------------------
// Fechar e reabrir
// ---------------------------------------------------------------------------

export async function fecharCiclo(cicloId: string): Promise<number> {
  const { data, error } = await supabase.rpc("relatorio_fechar_ciclo" as never, {
    _ciclo_id: cicloId,
  } as never);
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function reabrirCiclo(cicloId: string, motivo: string): Promise<void> {
  const { error } = await supabase.rpc("relatorio_reabrir_ciclo" as never, {
    _ciclo_id: cicloId,
    _motivo: motivo,
  } as never);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

/**
 * Reais em pt-BR. Nulo NÃO vira "R$ 0,00" — vira o texto que diz a verdade.
 * É a única barreira de exibição contra o valor inventado, e por isso não
 * aceita fallback numérico.
 */
export function formatarReais(valor: number | null): string {
  if (valor === null || valor === undefined) return "não definido";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarPercentual(pct: number | null): string {
  if (pct === null || pct === undefined) return "—";
  return `${pct.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
