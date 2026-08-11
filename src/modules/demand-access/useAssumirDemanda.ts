import { useCallback, useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { updateCard, type AtividadeCard } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useAssignDemand } from "@/modules/demands";
import type { Demand } from "@/modules/demands/types";

/**
 * Assumir uma demanda — a escrita mínima que uma tela de fila precisa.
 *
 * POR QUE NÃO É `useAcoesDemanda`
 * Aquele hook nasce de UM escopo, e escopo decide a fonte. "Hoje" soma duas
 * fontes: cada cartão pode vir de um quadro (`atividades_cards`) ou da fila
 * global (`demands`). Como hook não pode ser criado por item, aqui a fonte é
 * decidida NA CHAMADA — pela presença de um `projetoId` —, que é a mesma regra
 * de `resolverFonte`, só que aplicada por demanda em vez de por tela.
 *
 * A UI continua sem saber de tabela: ela passa o id do projeto que já tinha em
 * mãos (ou `null`) e recebe uma promessa.
 */
export interface AssumirDemanda {
  assumir: (demandaId: string, projetoId: string | null, pessoaId: string) => Promise<void>;
  /**
   * Devolver a demanda para "sem responsável" — a volta de `assumir`, usando as
   * MESMAS escritas (`updateCard` no quadro, `assignDemand` na fila global).
   * Nenhuma função nova de banco: atribuir vazio já é o caminho existente.
   */
  desassumir: (demandaId: string, projetoId: string | null) => Promise<void>;
  /** Em voo agora — para o botão do cartão se desabilitar sem travar o quadro inteiro. */
  assumindo: (demandaId: string) => boolean;
}

/**
 * O AVATAR PRECISA SUMIR ANTES DO SERVIDOR RESPONDER.
 *
 * Sem isto, remover a atribuição deixava a foto na tela até o refetch chegar —
 * meio segundo em que o clique parecia não ter acontecido e o botão "Assumir"
 * continuava escondido. Escrevemos direto no cache das duas fontes; o refetch
 * que vem depois apenas confirma.
 */
function limparResponsavelNoCache(qc: QueryClient, demandaId: string, projetoId: string | null) {
  if (projetoId) {
    qc.setQueriesData<AtividadeCard[]>({ queryKey: atividadesKeys.all }, (antigo) => {
      if (!Array.isArray(antigo)) return antigo;
      let mudou = false;
      const proximo = antigo.map((c) => {
        if (!c || typeof c !== "object" || !("responsavelIds" in c) || c.id !== demandaId) return c;
        mudou = true;
        return { ...c, responsavelIds: [], responsavelPersonaIds: [] };
      });
      return mudou ? proximo : antigo;
    });
    return;
  }
  qc.setQueriesData<Demand[]>({ queryKey: ["demands"] }, (antigo) => {
    if (!Array.isArray(antigo)) return antigo;
    let mudou = false;
    const proximo = antigo.map((d) => {
      if (!d || typeof d !== "object" || !("assigned_to" in d) || d.id !== demandaId) return d;
      mudou = true;
      return { ...d, assigned_to: null };
    });
    return mudou ? proximo : antigo;
  });
}

export function useAssumirDemanda(): AssumirDemanda {
  const qc = useQueryClient();
  const assignDemand = useAssignDemand();
  const [emVoo, setEmVoo] = useState<Set<string>>(new Set());

  const marcar = useCallback((id: string, ligado: boolean) => {
    setEmVoo((atual) => {
      const proximo = new Set(atual);
      if (ligado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }, []);


  const assumir = useCallback<AssumirDemanda["assumir"]>(
    async (demandaId, projetoId, pessoaId) => {
      // O domínio prefixa ids de pessoa (`u:` usuário, `p:` persona); a fonte
      // guarda o id cru. Mesma normalização de `useAcoesDemanda.atribuir`.
      const idCru = pessoaId.replace(/^[up]:/, "");
      marcar(demandaId, true);
      try {
        if (projetoId) {
          await updateCard(demandaId, { responsavelIds: [idCru] });
          // "Hoje" lê os cartões por uma chave própria (todos os quadros), que
          // a mutação por quadro não conhece: invalidar a raiz atualiza as duas.
          await qc.invalidateQueries({ queryKey: atividadesKeys.all });
          return;
        }
        await assignDemand.mutateAsync({ id: demandaId, assigned_to: idCru });
      } finally {
        marcar(demandaId, false);
      }
    },
    [assignDemand, marcar, qc],
  );

  const desassumir = useCallback<AssumirDemanda["desassumir"]>(
    async (demandaId, projetoId) => {
      marcar(demandaId, true);
      // Otimismo primeiro: o avatar sai e o "Assumir" volta no mesmo frame.
      limparResponsavelNoCache(qc, demandaId, projetoId);
      try {
        if (projetoId) {
          await updateCard(demandaId, { responsavelIds: [] });
          await qc.invalidateQueries({ queryKey: atividadesKeys.all });
          return;
        }
        await assignDemand.mutateAsync({ id: demandaId, assigned_to: null });
      } catch (e) {
        // O refetch devolve a verdade do servidor — nada de rollback à mão.
        await qc.invalidateQueries({
          queryKey: projetoId ? atividadesKeys.all : ["demands"],
        });
        throw e;
      } finally {
        marcar(demandaId, false);
      }
    },
    [assignDemand, marcar, qc],
  );

  const assumindo = useCallback((demandaId: string) => emVoo.has(demandaId), [emVoo]);

  return { assumir, desassumir, assumindo };

}
