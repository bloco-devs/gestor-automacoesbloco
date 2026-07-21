import { supabase } from "@/integrations/supabase/client";
import type { Demand, DemandPriority, DemandStatus, DemandType } from "@/modules/demands/types";

export interface DemandMetrics {
  total: number;
  ativas: number;
  concluidas: number;
  slaCumprimentoPct: number | null;
  tempoMedioResolucaoHoras: number | null;
  emAlerta: number;
  estouradas: number;
  noPrazo: number;
  porStatus: Record<DemandStatus, number>;
  porPrioridade: Record<DemandPriority, number>;
  porTipo: Record<DemandType, number>;
  // Deflexão / IA
  respondidasPorIA: number;
  defletidasKB: number;
  economiaPct: number;
}

export interface DeflectionStats {
  respondidasPorIA: number;
  defletidasKB: number;
}

export interface SlaPolicy {
  id: string;
  priority: DemandPriority;
  resolution_time_hours: number;
  updated_at: string;
}

export async function fetchDemandsForMetrics(): Promise<Demand[]> {
  const { data, error } = await supabase
    .from("demands" as never)
    .select("*")
    .is("deleted_at", null);
  if (error) throw error;
  return (data ?? []) as unknown as Demand[];
}

export function computeMetrics(demands: Demand[]): DemandMetrics {
  const porStatus = {
    backlog: 0, a_fazer: 0, em_desenvolvimento: 0, em_testes: 0, homologacao: 0, concluido: 0,
  } as Record<DemandStatus, number>;
  const porPrioridade = { baixa: 0, media: 0, alta: 0, critica: 0 } as Record<DemandPriority, number>;
  const porTipo = {
    bug: 0, melhoria: 0, nova_funcionalidade: 0, refatoracao: 0, infraestrutura: 0, automacao: 0,
  } as Record<DemandType, number>;

  let concluidas = 0;
  let cumpridas = 0;
  let noPrazo = 0;
  let emAlerta = 0;
  let estouradas = 0;
  let somaHoras = 0;
  let contResolvidas = 0;

  for (const d of demands) {
    porStatus[d.status] = (porStatus[d.status] ?? 0) + 1;
    porPrioridade[d.priority] = (porPrioridade[d.priority] ?? 0) + 1;
    porTipo[d.type] = (porTipo[d.type] ?? 0) + 1;

    if (d.status === "concluido") {
      concluidas++;
      if (d.sla_status === "cumprido" || d.sla_status === "no_prazo") cumpridas++;
      const created = new Date(d.created_at).getTime();
      const finished = new Date(d.updated_at).getTime();
      if (!Number.isNaN(created) && !Number.isNaN(finished) && finished > created) {
        somaHoras += (finished - created) / (1000 * 60 * 60);
        contResolvidas++;
      }
    }
    if (d.sla_status === "no_prazo") noPrazo++;
    if (d.sla_status === "atencao") emAlerta++;
    if (d.sla_status === "estourado") estouradas++;
  }

  const total = demands.length;
  const ativas = total - concluidas;
  const slaCumprimentoPct = concluidas > 0 ? (cumpridas / concluidas) * 100 : null;
  const tempoMedioResolucaoHoras = contResolvidas > 0 ? somaHoras / contResolvidas : null;

  return {
    total, ativas, concluidas,
    slaCumprimentoPct, tempoMedioResolucaoHoras,
    emAlerta, estouradas, noPrazo,
    porStatus, porPrioridade, porTipo,
  };
}

export async function listSlaPolicies(): Promise<SlaPolicy[]> {
  const { data, error } = await supabase
    .from("sla_policies" as never)
    .select("*")
    .order("resolution_time_hours", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as SlaPolicy[];
}

export async function updateSlaPolicy(id: string, hours: number): Promise<void> {
  const { error } = await supabase
    .from("sla_policies" as never)
    .update({ resolution_time_hours: hours } as never)
    .eq("id", id);
  if (error) throw error;
}
