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

/**
 * As quatro primeiras são uma PARTIÇÃO:
 *
 *   concluidas_no_ciclo = elegiveis + sem_fechamento
 *                       + sem_classificacao + sem_data_confiavel
 *
 * As duas últimas são CUMULATIVAS e não entram nessa soma. `com_fechamento`
 * conta toda demanda com relato registrado, inclusive as que já são elegíveis;
 * serve para a frase "40 de 47 já têm relato". Somar as seis daria um número
 * sem significado.
 */
export interface PendenciasDoCiclo {
  concluidas_no_ciclo: number;
  elegiveis: number;
  sem_fechamento: number;
  sem_classificacao: number;
  sem_data_confiavel: number;
  com_fechamento: number;
  classificadas: number;
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
// Administração de ciclos
// ---------------------------------------------------------------------------

/**
 * Um ciclo com estado e números, para a tela de gestão.
 *
 * `fim` é EXCLUSIVO — é o primeiro instante que já não conta. A tela nunca
 * mostra esse valor cru: quem lê espera ver "19/09", não "20/09 00:00". A
 * conversão fica em `ultimoDiaIncluido` / `limiteExclusivo`, num lugar só.
 */
export interface CicloAdministravel {
  id: string;
  rotulo: string;
  /** Mês da FOLHA de destino, sempre no dia 1. Não é o período de produção. */
  referencia: string;
  inicio: string;
  fim: string;
  meta_pontos: number;
  situacao: "aberto" | "em_analise" | "fechado" | "aprovado";
  editavel: boolean;
  congelado: boolean;
  fechado_em: string | null;
  fechado_por_email: string | null;
  aprovado_em: string | null;
  observacoes: string | null;
  /** Partição: concluidas = elegiveis + sem_* (as três). Sem dupla contagem. */
  concluidas: number;
  elegiveis: number;
  sem_fechamento: number;
  sem_classificacao: number;
  sem_data_confiavel: number;
  /** Cumulativas, NÃO somam com as de cima. */
  com_fechamento: number;
  classificadas: number;
  pontos: number;
  percentual: number | null;
  faixa_rotulo: string | null;
  valor_reais: number | null;
  faixa_indefinida: boolean;
}

export async function buscarCiclosAdministraveis(): Promise<CicloAdministravel[]> {
  const { data, error } = await supabase.rpc("relatorio_ciclos_administraveis" as never, {} as never);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CicloAdministravel[];
}

export interface DadosDoCiclo {
  rotulo: string;
  /** 'YYYY-MM' — o mês da folha. */
  referencia: string;
  /** ISO UTC, primeiro instante de produção. */
  inicio: string;
  /** ISO UTC, limite exclusivo. */
  fim: string;
  meta: number;
}

export async function criarCiclo(d: DadosDoCiclo): Promise<void> {
  const { error } = await supabase.rpc("relatorio_criar_ciclo" as never, {
    _rotulo: d.rotulo,
    _referencia: `${d.referencia}-01`,
    _inicio: d.inicio,
    _fim: d.fim,
    _meta: d.meta,
  } as never);
  // As RPCs já falam português e citam o ciclo em conflito pelo nome. Traduzir
  // de novo aqui só perderia a informação de qual é o conflito.
  if (error) throw new Error(error.message);
}

export async function editarCiclo(cicloId: string, d: DadosDoCiclo): Promise<void> {
  const { error } = await supabase.rpc("relatorio_editar_ciclo" as never, {
    _ciclo_id: cicloId,
    _rotulo: d.rotulo,
    _referencia: `${d.referencia}-01`,
    _inicio: d.inicio,
    _fim: d.fim,
    _meta: d.meta,
  } as never);
  if (error) throw new Error(error.message);
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
