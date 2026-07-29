import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateCard } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useAssignDemand } from "@/modules/demands";

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
  /** Em voo agora — para o botão do cartão se desabilitar sem travar o quadro inteiro. */
  assumindo: (demandaId: string) => boolean;
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

  const assumindo = useCallback((demandaId: string) => emVoo.has(demandaId), [emVoo]);

  return { assumir, assumindo };
}
