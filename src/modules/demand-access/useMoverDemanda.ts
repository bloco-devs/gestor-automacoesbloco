import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listColunas, updateCard } from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useUpdateDemandStatus } from "@/modules/demands";
import type { DemandStatus } from "@/modules/demands/types";

/**
 * Mover uma demanda de etapa numa tela de FONTE MISTA.
 *
 * POR QUE NÃO É `useAcoesDemanda`
 * Aquele hook nasce de UM escopo, e escopo decide a fonte. "Hoje" soma duas:
 * cada cartão vem de um quadro (`atividades_cards`, status = id de coluna,
 * um UUID por quadro) ou da fila global (`demands`, status = enum). Como hook
 * não pode ser criado por cartão, a fonte é decidida NA CHAMADA, pela presença
 * de um `projetoId` — a mesma regra de `resolverFonte`, por demanda.
 *
 * A TRADUÇÃO É POR RÓTULO, NÃO POR ID
 * O id da coluna de destino que o board entrega pertence a UM quadro (ou é o
 * enum de `demands`, ou é um id sintético de coluna vazia). Repassá-lo cru
 * falharia para qualquer cartão de outro quadro. O que une as duas fontes é o
 * NOME da etapa — é por ele que `unirGruposHomonimos` já funde as colunas.
 */
export interface MoverDemanda {
  /** `rotuloDestino` é o nome da etapa como aparece na tela ("Em Testes"). */
  mover: (demandaId: string, projetoId: string | null, rotuloDestino: string) => Promise<void>;
  movendo: (demandaId: string) => boolean;
}

function normalizar(rotulo: string): string {
  return rotulo
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Rótulo visível -> enum de `demands`. Fonte da verdade: `DemandStatus`. */
const ENUM_POR_ROTULO: Record<string, DemandStatus> = {
  backlog: "backlog",
  "a fazer": "a_fazer",
  "em desenvolvimento": "em_desenvolvimento",
  "em testes": "em_testes",
  homologacao: "homologacao",
  concluido: "concluido",
  concluida: "concluido",
};

export function useMoverDemanda(): MoverDemanda {
  const qc = useQueryClient();
  const statusDemand = useUpdateDemandStatus();
  const [emVoo, setEmVoo] = useState<Set<string>>(new Set());

  // Mesma chave (e mesmo cache) que `useTodasAsDemandas` já usa para as
  // colunas de todos os quadros: nenhuma ida a mais ao servidor.
  const colunasQ = useQuery({
    queryKey: [...atividadesKeys.all, "colunas", "todos-os-quadros"],
    queryFn: () => listColunas(),
    staleTime: 30_000,
  });
  const colunas = useMemo(() => colunasQ.data ?? [], [colunasQ.data]);

  const marcar = useCallback((id: string, ligado: boolean) => {
    setEmVoo((atual) => {
      const proximo = new Set(atual);
      if (ligado) proximo.add(id);
      else proximo.delete(id);
      return proximo;
    });
  }, []);

  const mover = useCallback<MoverDemanda["mover"]>(
    async (demandaId, projetoId, rotuloDestino) => {
      const alvo = normalizar(rotuloDestino);
      marcar(demandaId, true);
      try {
        if (projetoId) {
          // "Concluído" não é coluna de quadro nenhum: é um booleano à parte
          // (`atividades_cards.concluido`), como já documenta `useAcoesDemanda`.
          if (alvo === "concluido" || alvo === "concluida") {
            await updateCard(demandaId, { concluido: true });
          } else {
            const coluna = colunas.find(
              (c) => c.boardId === projetoId && normalizar(c.nome) === alvo,
            );
            if (!coluna) {
              throw new Error(`Este projeto não tem a etapa “${rotuloDestino}”.`);
            }
            // Sair da faixa de concluídos precisa desmarcar o booleano —
            // senão o cartão troca de coluna e continua recolhido.
            await updateCard(demandaId, { colunaId: coluna.id, concluido: false });
          }
          // "Hoje" lê os cartões por uma chave própria (todos os quadros), que
          // a mutação por quadro não conhece: invalidar a raiz atualiza as duas.
          await qc.invalidateQueries({ queryKey: atividadesKeys.all });
          return;
        }

        const status = ENUM_POR_ROTULO[alvo];
        if (!status) {
          throw new Error(`A etapa “${rotuloDestino}” não existe na fila global.`);
        }
        await statusDemand.mutateAsync({ id: demandaId, status });
      } finally {
        marcar(demandaId, false);
      }
    },
    [colunas, marcar, qc, statusDemand],
  );

  const movendo = useCallback((demandaId: string) => emVoo.has(demandaId), [emVoo]);

  return { mover, movendo };
}
