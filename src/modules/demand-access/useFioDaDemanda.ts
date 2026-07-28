import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listComments, listAuditLogs, createComment } from "@/modules/demands/timeline-service";
import { getProfilesByIds } from "@/modules/demands/service";
import { STATUS_COLUMNS, PRIORITY_META } from "@/modules/demands/types";
import { autorIa, frasePara, type Evento } from "@/domain/demand";
import type { Pessoa } from "@/domain/demand";

/**
 * O fio de uma demanda — leitura e escrita.
 *
 * A TRADUÇÃO QUE ACONTECE AQUI
 * As fontes têm duas tabelas: `demand_comments` e `demand_audit_logs`. O
 * domínio tem um conceito: `Evento`. Esta camada faz a ponte, e é o único lugar
 * do sistema que sabe que existem duas tabelas.
 *
 * Também é aqui que `field_name`/`old_value`/`new_value` viram frase em
 * português: traduzir "status: a_fazer → em_desenvolvimento" para "moveu para
 * A Fazer" exige conhecer os rótulos das tabelas, e conhecer rótulos de tabela
 * é exatamente o que a tela não pode fazer.
 *
 * QUEM NÃO TEM FIO
 * Uma demanda vinda de `atividades_cards` não tem comentário nem auditoria —
 * a tabela não tem esses campos. `capacidades.comentarios` e
 * `capacidades.auditoria` já dizem isso, e a tela usa essa informação para não
 * desenhar uma coluna vazia que o usuário leria como "ninguém falou nada".
 */

const ROTULO_STATUS = new Map(STATUS_COLUMNS.map((c) => [c.id as string, c.label]));

function rotuloDe(valor: string): string {
  return (
    ROTULO_STATUS.get(valor) ??
    (PRIORITY_META as Record<string, { label: string }>)[valor]?.label ??
    valor.replace(/_/g, " ")
  );
}

/** Um anexo já classificado, como o `useAnexos` devolve. */
export interface AnexoNoFio {
  id: string;
  nome: string;
  genero: string;
  em: string;
  autorId: string | null;
}

export function useFioDaDemanda(
  demandaId: string | null,
  opcoes: {
    habilitado: boolean;
    pessoas: Map<string, Pessoa>;
    internasVisiveis: boolean;
    /**
     * Os anexos entram no MESMO fio, e não numa aba própria.
     *
     * Separar em telas obriga a pessoa a cruzar duas cronologias na cabeça
     * para descobrir se o print veio antes ou depois da pergunta — e essa
     * ordem quase sempre é a explicação.
     */
    anexos?: AnexoNoFio[];
  },
) {
  const qc = useQueryClient();
  const { habilitado, pessoas } = opcoes;

  const comentariosQ = useQuery({
    queryKey: ["demanda", demandaId, "comentarios"],
    enabled: habilitado && !!demandaId,
    queryFn: () => listComments(demandaId as string),
  });

  const auditoriaQ = useQuery({
    queryKey: ["demanda", demandaId, "auditoria"],
    enabled: habilitado && !!demandaId,
    queryFn: () => listAuditLogs(demandaId as string),
  });

  /**
   * QUEM FALOU, MAS NÃO É AUTOR NEM RESPONSÁVEL
   *
   * O mapa `pessoas` que chega por parâmetro é montado a partir das demandas
   * já carregadas — ou seja, cobre quem abriu e quem é responsável. Quem só
   * passou para comentar (um segundo desenvolvedor, um gestor) não está lá, e
   * aparecia como "Alguém" no fio.
   *
   * Aqui buscamos exatamente os que faltam, e só eles: a consulta não sai se
   * o mapa recebido já explica todo mundo.
   */
  const idsDesconhecidos = useMemo(() => {
    const ids = new Set<string>();
    for (const c of comentariosQ.data ?? []) {
      if (c.user_id && !pessoas.has(c.user_id)) ids.add(c.user_id);
    }
    for (const a of auditoriaQ.data ?? []) {
      if (a.user_id && !pessoas.has(a.user_id)) ids.add(a.user_id);
    }
    return Array.from(ids).sort();
  }, [comentariosQ.data, auditoriaQ.data, pessoas]);

  const faltantesQ = useQuery({
    queryKey: ["perfis-do-fio", idsDesconhecidos.join(",")],
    enabled: idsDesconhecidos.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => getProfilesByIds(idsDesconhecidos),
  });

  /** O mapa recebido, completado com quem só aparece no fio. */
  const todasAsPessoas = useMemo(() => {
    if (!faltantesQ.data || faltantesQ.data.size === 0) return pessoas;
    const m = new Map(pessoas);
    for (const [id, p] of faltantesQ.data) {
      m.set(id, { id, nome: p.nome ?? "Alguém", avatarUrl: p.avatar_url ?? null });
    }
    return m;
  }, [pessoas, faltantesQ.data]);

  const eventos = useMemo<Evento[]>(() => {
    const falas: Evento[] = (comentariosQ.data ?? []).map((c) => ({
      id: `c:${c.id}`,
      tipo: "fala" as const,
      // A IA responde como participante, com o mesmo peso de uma pessoa. O que
      // a distingue é a marca, não um lugar separado na tela.
      autor: c.is_ai
        ? autorIa()
        : c.user_id
          ? { ...(todasAsPessoas.get(c.user_id) ?? { id: c.user_id, nome: "Alguém", avatarUrl: null }), ia: false }
          : null,
      em: c.created_at,
      texto: c.content,
      interna: c.is_internal,
    }));

    const mudancas: Evento[] = (auditoriaQ.data ?? []).map((a) => ({
      id: `a:${a.id}`,
      tipo: "mudanca" as const,
      autor: a.user_id
        ? { ...(todasAsPessoas.get(a.user_id) ?? { id: a.user_id, nome: "Alguém", avatarUrl: null }), ia: false }
        : null,
      em: a.created_at,
      texto: frasePara(a.action, a.field_name, a.old_value, a.new_value, rotuloDe),
      interna: false,
    }));

    const enviosDeAnexo: Evento[] = (opcoes.anexos ?? []).map((a) => ({
      id: `x:${a.id}`,
      tipo: "anexo" as const,
      autor: a.autorId
        ? { ...(todasAsPessoas.get(a.autorId) ?? { id: a.autorId, nome: "Alguém", avatarUrl: null }), ia: false }
        : null,
      em: a.em,
      texto: a.nome,
      anexoId: a.id,
      interna: false,
    }));

    return [...falas, ...mudancas, ...enviosDeAnexo];
  }, [comentariosQ.data, auditoriaQ.data, todasAsPessoas, opcoes.anexos]);

  const comentar = useCallback(
    async (texto: string, interna: boolean) => {
      if (!demandaId) return;
      await createComment(demandaId, texto, interna);
      await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "comentarios"] });
    },
    [demandaId, qc],
  );

  return {
    eventos,
    carregando: comentariosQ.isLoading || auditoriaQ.isLoading,
    erro: (comentariosQ.error as Error | null) ?? (auditoriaQ.error as Error | null) ?? null,
    comentar,
    podeComentar: habilitado,
  };
}
