import type { Risco, Sla } from "../types";

/**
 * Cálculo de risco — o único lugar do sistema onde se decide se uma demanda
 * pede atenção.
 *
 * Está isolado dos adapters de propósito: as duas fontes têm sinais diferentes
 * (uma tem SLA, a outra só data de entrega), mas a REGRA de precedência precisa
 * ser a mesma, senão a mesma demanda apareceria como crítica numa lente e
 * tranquila em outra depois da migração.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Limiar de estagnação, em dias sem qualquer movimentação.
 *
 * É uma decisão de produto, não de negócio: define a partir de quando a
 * interface passa a chamar atenção para o item. Fica no domínio para que Lista,
 * Board e Copiloto usem exatamente o mesmo número.
 */
export const DIAS_PARA_PARADA = 14;

export function diasDesde(iso: string | null | undefined, agora = Date.now()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((agora - t) / DIA_MS));
}

type JanelaPrazo = "atrasado" | "hoje" | "em_breve" | "no_prazo" | "sem_prazo";

/** Em que janela o prazo cai, comparado ao início do dia de hoje. */
export function janelaDoPrazo(prazo: string | null, agora = Date.now()): JanelaPrazo {
  if (!prazo) return "sem_prazo";
  const venc = new Date(prazo).getTime();
  if (Number.isNaN(venc)) return "sem_prazo";

  const hoje = new Date(agora);
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const inicioAmanha = inicioHoje + DIA_MS;
  const em7Dias = inicioHoje + 7 * DIA_MS;

  if (venc < inicioHoje) return "atrasado";
  if (venc < inicioAmanha) return "hoje";
  if (venc <= em7Dias) return "em_breve";
  return "no_prazo";
}

export interface EntradaRisco {
  concluida: boolean;
  prazo: string | null;
  /** `null` quando a fonte não tem SLA. */
  sla: Sla | null;
  diasParada: number;
}

/**
 * Precedência (do mais grave para o menos):
 *   SLA estourado > atrasada > vence hoje > SLA em atenção > parada > vence em breve
 *
 * Demanda concluída nunca tem risco — mesmo que o prazo tenha passado, o
 * trabalho acabou, e manter alerta em item concluído treina o usuário a ignorar
 * alertas.
 */
export function calcularRisco({ concluida, prazo, sla, diasParada }: EntradaRisco, agora = Date.now()): Risco {
  if (concluida) return null;

  if (sla?.estado === "estourado") return "sla_estourado";

  const janela = janelaDoPrazo(prazo, agora);
  if (janela === "atrasado") return "atrasada";
  if (janela === "hoje") return "vence_hoje";

  if (sla?.estado === "atencao") return "sla_atencao";
  if (diasParada >= DIAS_PARA_PARADA) return "parada";
  if (janela === "em_breve") return "vence_em_breve";

  return null;
}
