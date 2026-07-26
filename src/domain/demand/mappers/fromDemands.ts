import type { Demand, DemandStatus } from "@/modules/demands/types";
import type {
  Capacidades,
  Demanda,
  Pessoa,
  ResultadoFonte,
  Sistema,
  Status,
  StatusCategoria,
} from "../types";
import { calcularRisco, diasDesde } from "../services/risco";

/**
 * Adapter: `demands` → Demanda.
 *
 * Esta é a fonte de ticket de verdade: tem SLA, tipo, complexidade, auditoria e
 * os campos de IA (`ai_auto_responded`, `ai_confidence_score`,
 * `ai_response_article_id`). É para cá que o produto deve migrar — mas a
 * migração acontece trocando qual adapter alimenta a tela, não reescrevendo a
 * tela.
 *
 * Nenhuma consulta nova: consome o que `useDemands()` já devolve.
 */

export const CAPACIDADES_DEMANDS: Capacidades = {
  sla: true,
  ia: true,
  tipo: true,
  complexidade: true,
  auditoria: true,
  comentarios: true,
  progresso: true,
  etiquetas: false,
  prazo: false,
};

/**
 * Diferente das colunas de quadro, aqui o status é um enum fechado — então o
 * mapeamento é explícito, sem heurística. `homologacao` conta como espera
 * porque a bola está com outra pessoa: a equipe não está trabalhando nela.
 */
const STATUS_META: Record<DemandStatus, { rotulo: string; categoria: StatusCategoria; ordem: number }> = {
  backlog: { rotulo: "Backlog", categoria: "aberta", ordem: 0 },
  a_fazer: { rotulo: "A fazer", categoria: "aberta", ordem: 1 },
  em_desenvolvimento: { rotulo: "Em desenvolvimento", categoria: "andamento", ordem: 2 },
  em_testes: { rotulo: "Em testes", categoria: "andamento", ordem: 3 },
  homologacao: { rotulo: "Homologação", categoria: "espera", ordem: 4 },
  concluido: { rotulo: "Concluída", categoria: "concluida", ordem: 5 },
};

function referenciaCurta(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 6)}`;
}

export interface EntradaDemands {
  demands: Demand[];
  /** Perfis já carregados por `useDemandProfiles`. */
  pessoasPorId?: Map<string, Pessoa>;
  /** Catálogo de sistemas/soluções já carregado. */
  sistemasPorId?: Map<string, Sistema>;
  /** Contagem de comentários por demanda, quando disponível. */
  comentariosPorDemanda?: Map<string, number>;
  /** Progresso por `demand_tasks`, quando disponível. */
  tarefasPorDemanda?: Map<string, { feitos: number; total: number }>;
  agora?: number;
}

export function fromDemands({
  demands,
  pessoasPorId,
  sistemasPorId,
  comentariosPorDemanda,
  tarefasPorDemanda,
  agora = Date.now(),
}: EntradaDemands): ResultadoFonte {
  const demandas = demands.map((d): Demanda => {
    const meta = STATUS_META[d.status] ?? {
      rotulo: d.status,
      categoria: "andamento" as StatusCategoria,
      ordem: 99,
    };

    const status: Status = {
      id: d.status,
      rotulo: meta.rotulo,
      categoria: meta.categoria,
      ordem: meta.ordem,
    };

    const responsavel = d.assigned_to ? pessoasPorId?.get(d.assigned_to) : undefined;
    const autor = pessoasPorId?.get(d.created_by);
    const sistema = d.system_id ? (sistemasPorId?.get(d.system_id) ?? null) : null;
    const tarefas = tarefasPorDemanda?.get(d.id);
    const concluida = d.status === "concluido";
    const diasParada = diasDesde(d.updated_at, agora);

    // O SLA é o sinal de risco desta fonte. `sla_due_at` alimenta o prazo, já
    // que `demands` não tem data de entrega separada — é o mesmo compromisso.
    const sla = {
      estado: d.sla_status,
      venceEm: d.sla_due_at,
      primeiraRespostaEm: d.sla_first_response_at,
    };

    // Só marca IA quando ela de fato atuou. Ausência de marca é diferente de
    // "confiança zero" — não sinalizamos o que não aconteceu.
    const atuouIa = d.ai_auto_responded === true || !!d.ai_response_article_id;

    return {
      id: d.id,
      referencia: referenciaCurta(d.id),
      titulo: d.title,
      descricao: d.description ?? "",

      status,
      prioridade: d.priority,
      tipo: d.type,
      complexidade: d.complexity,
      sistema,

      responsaveis: responsavel ? [responsavel] : [],
      autor: autor ?? null,

      criadaEm: d.created_at,
      atualizadaEm: d.updated_at,
      diasParada,

      prazo: d.sla_due_at,
      sla,
      ia: atuouIa
        ? {
            respondeuSozinha: d.ai_auto_responded === true,
            confianca: d.ai_confidence_score ?? null,
            artigoId: d.ai_response_article_id ?? null,
          }
        : null,

      progresso: tarefas
        ? {
            feitos: tarefas.feitos,
            total: tarefas.total,
            percentual: tarefas.total > 0 ? Math.round((tarefas.feitos / tarefas.total) * 100) : 0,
          }
        : null,
      comentarios: comentariosPorDemanda?.get(d.id) ?? null,
      anexos: d.attachments_count ?? null,
      etiquetas: [],

      concluida,
      risco: calcularRisco({ concluida, prazo: d.sla_due_at, sla, diasParada }, agora),

      fonte: "demands",
    };
  });

  return { demandas, capacidades: CAPACIDADES_DEMANDS, fonte: "demands" };
}
