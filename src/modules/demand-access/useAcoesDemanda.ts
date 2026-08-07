import { useCallback, useMemo } from "react";
import { useCardMutations } from "@/hooks/useCardMutations";
import { useAssignDemand, useUpdateDemandStatus } from "@/modules/demands";
import type { DemandStatus } from "@/modules/demands/types";
import { ordensDaLista } from "@/modules/workspace-demandas/ordenacao";
import { projetoDoEscopo, resolverFonte } from "./resolverFonte";
import { useReordenarFila } from "./useReordenarFila";
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
  const filaDeDemandas = useReordenarFila("demands", ["demands"]);

  const mover = useCallback<AcoesDemanda["mover"]>(
    async ({ demandaId, statusId, ordem, ordemDaColuna }) => {
      if (fonte === "atividades") {
        // No quadro, "status" é a coluna. `reorder` já move e reposiciona numa
        // única chamada, com otimismo e rollback herdados.
        //
        // Com a coluna inteira em mãos, reescrevemos a sequência dela: cada
        // card recebe a posição que tem na lista. É o que garante que o card
        // solto no topo FIQUE no topo — mandar só ele com `ordem: 0` deixaria
        // dois cards disputando a mesma posição, e o desempate seria do banco.
        if (ordemDaColuna && ordemDaColuna.length > 0) {
          await cards.reorder.mutateAsync(
            ordemDaColuna.map((id, i) => ({ id, colunaId: statusId, ordem: i })),
          );
          return;
        }
        await cards.reorder.mutateAsync([{ id: demandaId, colunaId: statusId, ordem: ordem ?? 0 }]);
        return;
      }

      /**
       * Caixa de Entrada (fonte `demands`): a coluna é o enum de status, e a
       * posição dentro dela mora em `ordem_manual`. As duas escritas são
       * independentes — trocar de coluna sem reposicionar continua válido, e
       * reposicionar sem trocar de coluna é o caso novo (arrasto vertical).
       */
      await statusDemand.mutateAsync({ id: demandaId, status: statusId as DemandStatus });
      if (ordemDaColuna && ordemDaColuna.length > 0) {
        await filaDeDemandas.reordenar(ordensDaLista(ordemDaColuna));
      }
    },
    [fonte, cards.reorder, statusDemand, filaDeDemandas],
  );


  const concluir = useCallback<AcoesDemanda["concluir"]>(
    async ({ demandaId }) => {
      if (fonte === "atividades") {
        // `concluido` é campo próprio do card, não uma coluna — mover para
        // uma coluna chamada "concluido" falharia (nenhum quadro tem uma
        // coluna com esse id). Setar o campo é o que a Lista/Board já leem
        // via `concluida: card.concluido` no adapter.
        await cards.update.mutateAsync({ id: demandaId, patch: { concluido: true } });
        return;
      }
      await statusDemand.mutateAsync({ id: demandaId, status: "concluido" as DemandStatus });
    },
    [fonte, cards.update, statusDemand],
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
      concluir,
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
      concluir,
      fonte,
      projetoId,
      cards.reorder.isPending,
      cards.update.isPending,
      statusDemand.isPending,
      assignDemand.isPending,
    ],
  );
}
