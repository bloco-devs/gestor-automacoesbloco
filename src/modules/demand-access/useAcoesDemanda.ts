import { useCallback, useMemo } from "react";
import { useCardMutations } from "@/hooks/useCardMutations";
import { useAssignDemand, useUpdateDemandStatus } from "@/modules/demands";
import type { DemandStatus } from "@/modules/demands/types";
import { projetoDoEscopo, resolverFonte } from "./resolverFonte";
import type { AcoesDemanda, Escopo } from "./types";

/**
 * A porta de escrita.
 *
 * Sem ela, mover um card no board obrigaria a UI a saber se está falando com
 * `atividades_cards` (trocar `colunaId`) ou com `demands` (trocar o enum
 * `status`) — e o desacoplamento da leitura teria sido inútil, porque a tela
 * voltaria a conhecer a tabela na hora de escrever.
 *
 * As mutações usadas aqui já existiam: `useCardMutations` (com atualização
 * otimista e rollback) e `useUpdateDemandStatus`/`useAssignDemand` (que também
 * disparam o Workflow Runtime). Nenhuma foi alterada nem duplicada.
 */
export function useAcoesDemanda(escopo: Escopo): AcoesDemanda {
  const fonte = resolverFonte(escopo);
  const projetoId = projetoDoEscopo(escopo);

  const cards = useCardMutations(fonte === "atividades" ? projetoId : null);
  const statusDemand = useUpdateDemandStatus();
  const assignDemand = useAssignDemand();

  const mover = useCallback<AcoesDemanda["mover"]>(
    async ({ demandaId, statusId, ordem }) => {
      if (fonte === "atividades") {
        // No quadro, "status" é a coluna. `reorder` já move e reposiciona numa
        // única chamada, com otimismo e rollback herdados.
        await cards.reorder.mutateAsync([{ id: demandaId, colunaId: statusId, ordem: ordem ?? 0 }]);
        return;
      }
      await statusDemand.mutateAsync({ id: demandaId, status: statusId as DemandStatus });
    },
    [fonte, cards.reorder, statusDemand],
  );

  const atribuir = useCallback<AcoesDemanda["atribuir"]>(
    async ({ demandaId, pessoaId }) => {
      if (fonte === "atividades") {
        // O domínio prefixa ids de pessoa (`u:` usuário, `p:` persona) porque um
        // card pode ter os dois. Aqui desfazemos o prefixo para falar com a fonte.
        const idCru = pessoaId?.replace(/^[up]:/, "") ?? null;
        await cards.update.mutateAsync({
          id: demandaId,
          patch: { responsavelIds: idCru ? [idCru] : [] },
        });
        return;
      }
      await assignDemand.mutateAsync({ id: demandaId, assigned_to: pessoaId });
    },
    [fonte, cards.update, assignDemand],
  );

  return useMemo<AcoesDemanda>(
    () => ({
      mover,
      atribuir,
      // Sem projeto não há coluna para onde mover: o board fica somente leitura
      // em vez de oferecer uma ação que falharia.
      podeMover: fonte === "demands" || !!projetoId,
      podeAtribuir: true,
      executando:
        cards.reorder.isPending ||
        cards.update.isPending ||
        statusDemand.isPending ||
        assignDemand.isPending,
    }),
    [
      mover,
      atribuir,
      fonte,
      projetoId,
      cards.reorder.isPending,
      cards.update.isPending,
      statusDemand.isPending,
      assignDemand.isPending,
    ],
  );
}
