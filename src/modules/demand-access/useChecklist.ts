import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listTasks, toggleTask, createTask, deleteTask } from "@/modules/demands/service";

/**
 * A definição de pronto de uma demanda.
 *
 * POR QUE ISTO NÃO É "MAIS UM CHECKLIST"
 * Estes itens são os critérios de aceite que a IA gerou a partir da conversa.
 * Marcá-los é como o desenvolvedor diz "terminei isto" — e é o mesmo dado que
 * habilita a sugestão "Concluir" no copiloto. Ou seja: fecha o laço entre o
 * que o solicitante pediu, o que a IA entendeu e o que foi de fato entregue.
 *
 * Quando alguém acrescenta um item aqui, está mudando a definição de pronto
 * depois do combinado. É legítimo — mas por isso os itens acrescentados à mão
 * ficam visualmente separados dos que vieram da conversa, na tela.
 */
export interface ItemDaLista {
  id: string;
  texto: string;
  feito: boolean;
}

export function useChecklist(demandaId: string | null, habilitado: boolean) {
  const qc = useQueryClient();
  const chave = ["demanda", demandaId, "checklist"];

  const q = useQuery({
    queryKey: chave,
    enabled: habilitado && !!demandaId,
    queryFn: () => listTasks(demandaId as string),
  });

  const itens = useMemo<ItemDaLista[]>(
    () => (q.data ?? []).map((t) => ({ id: t.id, texto: t.title, feito: t.completed })),
    [q.data],
  );

  const invalidar = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: chave });
    // O progresso aparece na lista e no board; sem isto o número só atualiza
    // quando alguém recarrega a página.
    await qc.invalidateQueries({ queryKey: ["demands"] });
  }, [qc, demandaId]);

  const marcar = useCallback(
    async (id: string, feito: boolean) => {
      // Otimista: marcar um item precisa responder na hora. Uma espera de
      // 300ms num gesto que se repete dez vezes seguidas é sentida como
      // travamento, e a pessoa clica duas vezes.
      qc.setQueryData(chave, (antigo: unknown) =>
        Array.isArray(antigo)
          ? antigo.map((t) => (t && typeof t === "object" && "id" in t && t.id === id ? { ...t, completed: feito } : t))
          : antigo,
      );
      try {
        await toggleTask(id, feito);
      } finally {
        await invalidar();
      }
    },
    [qc, demandaId, invalidar],
  );

  const acrescentar = useCallback(
    async (texto: string) => {
      if (!demandaId) return;
      await createTask(demandaId, texto);
      await invalidar();
    },
    [demandaId, invalidar],
  );

  const remover = useCallback(
    async (id: string) => {
      await deleteTask(id);
      await invalidar();
    },
    [invalidar],
  );

  const feitos = itens.filter((i) => i.feito).length;

  return {
    itens,
    feitos,
    total: itens.length,
    completo: itens.length > 0 && feitos === itens.length,
    carregando: q.isLoading,
    marcar,
    acrescentar,
    remover,
  };
}
