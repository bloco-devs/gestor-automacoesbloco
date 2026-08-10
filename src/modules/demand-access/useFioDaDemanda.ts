import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  listComments,
  listAuditLogs,
  createComment,
  updateComment,
  deleteComment,
  type DemandComment,
} from "@/modules/demands/timeline-service";
import { getProfilesByIds } from "@/modules/demands/service";
import { STATUS_COLUMNS, PRIORITY_META } from "@/modules/demands/types";
import { autorIa, frasePara, type Evento } from "@/domain/demand";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const { habilitado, pessoas } = opcoes;
  const chaveComentarios = ["demanda", demandaId, "comentarios"] as const;


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

  /**
   * O FIO PRECISA CHEGAR SOZINHO
   *
   * Sem isto, a conversa só aparecia ao recarregar a página. Duas pessoas
   * discutindo a mesma demanda ficavam cada uma com uma versão do diálogo, e
   * a mais nova era invisível para quem não soubesse apertar F5 — que é
   * justamente o solicitante, a pessoa com menos motivo para desconfiar da
   * tela.
   *
   * Três tabelas alimentam o fio, e todas precisam avisar:
   *   demand_comments    o que as pessoas escrevem
   *   demand_audit_logs  o que o sistema registra (assumiu, moveu, concluiu)
   *   demands            responsável, status, prioridade — o que o Contexto
   *                      e o Copiloto leem
   *
   * A terceira explica um sintoma que parecia outro bug: o fio dizia
   * "fulano assumiu a demanda" enquanto o Contexto insistia em "Ninguém
   * ainda". Não eram dados divergentes — era a mesma verdade, com um dos
   * lados parado no tempo.
   *
   * Nome de canal único por instância: o supabase-js guarda canais num cache
   * por nome, e dois componentes com o mesmo nome recebem o MESMO objeto — o
   * segundo tentaria inscrever num canal já inscrito e falharia. Foi
   * exatamente o erro que derrubou as notificações antes.
   */
  useEffect(() => {
    if (!habilitado || !demandaId) return;

    const canal = supabase
      .channel(`fio-${demandaId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demand_comments", filter: `demand_id=eq.${demandaId}` },
        () => qc.invalidateQueries({ queryKey: ["demanda", demandaId, "comentarios"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demand_audit_logs", filter: `demand_id=eq.${demandaId}` },
        () => qc.invalidateQueries({ queryKey: ["demanda", demandaId, "auditoria"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "demands", filter: `id=eq.${demandaId}` },
        () => qc.invalidateQueries({ queryKey: ["demands"] }),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [demandaId, habilitado, qc]);

  const eventos = useMemo<Evento[]>(() => {
    const falas: Evento[] = (comentariosQ.data ?? []).map((c) => ({
      id: `c:${c.id}`,
      tipo: "fala" as const,
      // A IA responde como participante, com o mesmo peso de uma pessoa. O que
      // a distingue é a marca, não um lugar separado na tela.
      // O aviso automático da triagem não é participante: ele é o sistema
      // avisando, e precisa parecer isso — senão quem abriu responde a ele.
      // Sem autor e sem marca de IA é o sistema falando: o aviso da triagem
      // nasce com `user_id` nulo. Deduzir isso aqui evita o "Alguém" com
      // avatar de interrogação quando a coluna `is_system` não vem.
      autor:
        c.is_system || (!c.user_id && !c.is_ai)
          ? { id: "sistema", nome: "Blink", avatarUrl: null, ia: false, sistema: true }
          : c.is_ai
            ? autorIa()
            : c.user_id
              ? { ...(todasAsPessoas.get(c.user_id) ?? { id: c.user_id, nome: "Alguém", avatarUrl: null }), ia: false }
              : null,
      em: c.created_at,
      texto: c.content,
      interna: c.is_internal,
      comentarioId: c.id,
      // Só o autor edita e exclui. A política do banco diz o mesmo; aqui é só
      // para não desenhar um botão que vai falhar.
      editavel: !c.is_system && !c.is_ai && !!c.user_id && c.user_id === user?.id,
      editadoEm: c.updated_at !== c.created_at ? c.updated_at : null,
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
  }, [comentariosQ.data, auditoriaQ.data, todasAsPessoas, opcoes.anexos, user?.id]);

  /**
   * AUTO-RESPOSTA DE TRIAGEM
   *
   * Quem escreve numa demanda sem responsável não tem como saber se alguém
   * leu. O aviso do Blink responde essa dúvida — e para de aparecer no
   * instante em que a demanda ganha dono.
   *
   * O insert é feito por `demand_auto_reply_triagem` no banco: a política de
   * `demand_comments` proíbe o cliente de gravar `is_system = true`, e é bom
   * que proíba — quem decide se ainda não há responsável é o servidor, não a
   * tela. A função também recusa repetir o aviso quando ele já é a última
   * mensagem do fio, o que cobre o usuário que manda três frases seguidas.
   */
  const comentar = useCallback(
    async (texto: string, interna: boolean) => {
      if (!demandaId) return;
      await createComment(demandaId, texto, interna);
      await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "comentarios"] });

      // Nota interna é conversa da equipe: o aviso de espera não cabe ali.
      if (interna || !opcoes.semResponsavel) return;

      // A pausa é deliberada: a resposta instantânea parece erro de tela.
      window.setTimeout(() => {
        void (async () => {
          const { data, error } = await supabase.rpc("demand_auto_reply_triagem" as never, {
            _demand_id: demandaId,
          } as never);
          if (error) {
            console.warn("[fio] auto-resposta de triagem falhou:", error.message);
            return;
          }
          if (!data) return; // o servidor decidiu não responder
          await qc.invalidateQueries({ queryKey: ["demanda", demandaId, "comentarios"] });
        })();
      }, 1200);
    },
    [demandaId, qc, opcoes.semResponsavel],
  );


  /**
   * EDITAR E EXCLUIR SÃO OTIMISTAS
   *
   * Corrigir uma palavra e esperar meio segundo pelo servidor faz a pessoa
   * duvidar se salvou. A lista muda na hora e volta ao estado anterior se o
   * banco recusar — a única resposta honesta quando a permissão não existe.
   */
  const editarComentario = useCallback(
    async (comentarioId: string, texto: string) => {
      const antes = qc.getQueryData<DemandComment[]>(chaveComentarios);
      qc.setQueryData<DemandComment[]>(chaveComentarios, (prev) =>
        (prev ?? []).map((c) =>
          c.id === comentarioId ? { ...c, content: texto, updated_at: new Date().toISOString() } : c,
        ),
      );
      try {
        await updateComment(comentarioId, texto);
      } catch (e) {
        if (antes) qc.setQueryData(chaveComentarios, antes);
        throw e;
      }
      await qc.invalidateQueries({ queryKey: chaveComentarios });
    },
    // A chave é derivada de `demandaId`; listá-la inteira criaria um novo array
    // a cada render e refaria o callback sem motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demandaId, qc],
  );

  const excluirComentario = useCallback(
    async (comentarioId: string) => {
      const antes = qc.getQueryData<DemandComment[]>(chaveComentarios);
      qc.setQueryData<DemandComment[]>(chaveComentarios, (prev) =>
        (prev ?? []).filter((c) => c.id !== comentarioId),
      );
      try {
        await deleteComment(comentarioId);
      } catch (e) {
        if (antes) qc.setQueryData(chaveComentarios, antes);
        throw e;
      }
      await qc.invalidateQueries({ queryKey: chaveComentarios });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demandaId, qc],
  );

  return {
    eventos,
    carregando: comentariosQ.isLoading || auditoriaQ.isLoading,
    erro: (comentariosQ.error as Error | null) ?? (auditoriaQ.error as Error | null) ?? null,
    comentar,
    editarComentario,
    excluirComentario,
    podeComentar: habilitado,

  };
}
