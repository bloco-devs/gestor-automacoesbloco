import type {
  AtividadeCard,
  AtividadeColuna,
  AtividadeLabel,
  AtividadePersona,
  Prioridade as PrioridadeAtividade,
} from "@/lib/atividades";
import type { AssignableUser, Solucao } from "@/lib/types";
import type {
  Capacidades,
  Demanda,
  Etiqueta,
  Pessoa,
  Prioridade,
  ResultadoFonte,
  Status,
  StatusCategoria,
} from "../types";
import { calcularRisco, diasDesde } from "../services/risco";

/**
 * Adapter: `atividades_cards` → Demanda.
 *
 * Esta é a fonte herdada da importação do Trello. Ela NÃO tem SLA, tipo,
 * complexidade, auditoria nem campos de IA — e o adapter declara isso em
 * `capacidades` em vez de devolver zeros. A diferença é importante: com
 * `sla: false`, a Lista não desenha a coluna de SLA; com `sla: true` e valor
 * nulo, ela desenha "sem SLA definido". São duas mensagens diferentes.
 *
 * Nenhuma consulta é feita aqui. Tudo já vem carregado por
 * `useAtividadesBoard(boardId)`, que continua intocado.
 */

export const CAPACIDADES_ATIVIDADES: Capacidades = {
  sla: false,
  ia: false,
  tipo: false,
  complexidade: false,
  auditoria: false,
  comentarios: false,
  progresso: true,
  etiquetas: true,
  prazo: true,
};

/**
 * Colunas de quadro têm nome livre ("Em Análise", "Pronto", "Backlog"), então a
 * categorização é heurística sobre o nome. Quando não reconhece, cai em
 * "andamento" — que é o palpite menos danoso: não promete que acabou nem
 * finge que nem começou.
 */
function categorizarColuna(nome: string, concluidoNoCard: boolean): StatusCategoria {
  if (concluidoNoCard) return "concluida";
  const n = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (/(concluid|finaliz|pronto|entregue|done|produc)/.test(n)) return "concluida";
  if (/(backlog|novo|nova|entrada|a fazer|todo|ideia|solicitad)/.test(n)) return "aberta";
  if (/(aguard|espera|bloquead|pausad|impedid|hold|homolog|revis|aprovac)/.test(n)) return "espera";
  return "andamento";
}

/** As prioridades das duas fontes quase coincidem: `urgente` vira `critica`. */
function normalizarPrioridade(p: PrioridadeAtividade | null): Prioridade | null {
  if (!p) return null;
  if (p === "urgente") return "critica";
  return p;
}

/** Referência curta e estável a partir do UUID, para citar em conversa. */
function referenciaCurta(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 6)}`;
}

export interface EntradaAtividades {
  cards: AtividadeCard[];
  colunas: AtividadeColuna[];
  labels: AtividadeLabel[];
  personas: AtividadePersona[];
  responsaveis: AssignableUser[];
  solucoes: Solucao[];
  /** Contagem por card, vinda de `countAnexosByBoard`. Opcional. */
  anexosPorCard?: Map<string, number>;
  /** Injetável para tornar o teste determinístico. */
  agora?: number;
}

export function fromAtividades({
  cards,
  colunas,
  labels,
  personas,
  responsaveis,
  solucoes,
  anexosPorCard,
  agora = Date.now(),
}: EntradaAtividades): ResultadoFonte {
  const colunasPorId = new Map(colunas.map((c) => [c.id, c]));
  const labelsPorId = new Map(labels.map((l) => [l.id, l]));
  const solucoesPorId = new Map(solucoes.map((s) => [s.id, s]));
  const usuariosPorId = new Map(responsaveis.map((r) => [r.id, r]));
  const personasPorId = new Map(personas.map((p) => [p.id, p]));

  const demandas = cards.map((card): Demanda => {
    const coluna = colunasPorId.get(card.colunaId);
    const rotulo = coluna?.nome ?? "Sem coluna";

    const status: Status = {
      id: card.colunaId,
      rotulo,
      categoria: categorizarColuna(rotulo, card.concluido),
      ordem: coluna?.ordem ?? 999,
    };

    // Uma pessoa pode estar no card como persona ou como usuário. Personas têm
    // precedência (é o nome que a equipe usa), e o usuário coberto por uma
    // persona não é listado duas vezes.
    const pessoas: Pessoa[] = [];
    const cobertosPorPersona = new Set<string>();
    for (const pid of card.responsavelPersonaIds) {
      const persona = personasPorId.get(pid);
      if (!persona) continue;
      const usuario = usuariosPorId.get(persona.userId);
      pessoas.push({ id: `p:${persona.id}`, nome: persona.nome, avatarUrl: usuario?.avatarUrl ?? null });
      cobertosPorPersona.add(persona.userId);
    }
    for (const uid of card.responsavelIds) {
      if (cobertosPorPersona.has(uid)) continue;
      const usuario = usuariosPorId.get(uid);
      if (!usuario) continue;
      pessoas.push({ id: `u:${usuario.id}`, nome: usuario.nome, avatarUrl: usuario.avatarUrl ?? null });
    }

    const etiquetas: Etiqueta[] = card.labelIds
      .map((id) => labelsPorId.get(id))
      .filter((l): l is AtividadeLabel => !!l)
      .map((l) => ({ id: l.id, nome: l.nome, cor: l.cor ?? null }));

    const total = card.checklist.length;
    const feitos = card.checklist.filter((c) => c.concluido).length;
    const solucao = card.solucaoId ? solucoesPorId.get(card.solucaoId) : undefined;
    const diasParada = diasDesde(card.updatedAt, agora);

    return {
      id: card.id,
      referencia: referenciaCurta(card.id),
      titulo: card.titulo,
      descricao: card.descricao ?? "",

      status,
      prioridade: normalizarPrioridade(card.prioridade),
      tipo: null,
      complexidade: null,
      sistema: solucao ? { id: solucao.id, nome: solucao.titulo } : null,

      responsaveis: pessoas,
      autor: null,

      criadaEm: card.createdAt,
      atualizadaEm: card.updatedAt,
      diasParada,

      prazo: card.dataEntrega,
      sla: null,
      ia: null,

      progresso: total > 0 ? { feitos, total, percentual: Math.round((feitos / total) * 100) } : null,
      comentarios: null,
      anexos: anexosPorCard?.get(card.id) ?? null,
      etiquetas,

      concluida: card.concluido,
      risco: calcularRisco(
        { concluida: card.concluido, prazo: card.dataEntrega, sla: null, diasParada },
        agora,
      ),

      fonte: "atividades",
    };
  });

  return { demandas, capacidades: CAPACIDADES_ATIVIDADES, fonte: "atividades" };
}
