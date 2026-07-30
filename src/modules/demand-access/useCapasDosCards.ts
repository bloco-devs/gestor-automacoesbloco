import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCapasDosCards } from "@/lib/atividadesCapas";
import { listEquipeUsuarios } from "@/lib/atividadesCardMembros";

/**
 * A capa dos cartões de um quadro: etiquetas (cor) e membros (avatar).
 *
 * A UI recebe um `Map` pronto para consumo — ela não conhece
 * `atividades_card_etiquetas` nem `atividades_card_membros`, na mesma regra do
 * resto desta camada.
 */

export interface MembroDaCapa {
  id: string;
  nome: string;
  avatarUrl: string | null;
}

export interface CapaResolvida {
  etiquetas: { id: string; nome: string | null; cor: string }[];
  membros: MembroDaCapa[];
}

export type CapasResolvidas = Map<string, CapaResolvida>;

export function useCapasDosCards(cardIds: string[], habilitado = true): CapasResolvidas {
  // A chave depende do CONJUNTO de cartões, não da ordem — ordenar evita
  // refetch a cada reagrupamento do board.
  const chave = useMemo(() => [...cardIds].sort(), [cardIds]);

  const capasQ = useQuery({
    queryKey: ["atividades", "capas-dos-cards", chave],
    queryFn: () => listCapasDosCards(chave),
    enabled: habilitado && chave.length > 0,
    staleTime: 30_000,
  });

  const equipeQ = useQuery({
    queryKey: ["atividades", "equipe-usuarios"],
    queryFn: listEquipeUsuarios,
    enabled: habilitado,
    staleTime: 5 * 60_000,
  });

  return useMemo<CapasResolvidas>(() => {
    const porUsuario = new Map((equipeQ.data ?? []).map((u) => [u.id, u]));
    const saida: CapasResolvidas = new Map();
    for (const [cardId, capa] of capasQ.data ?? new Map()) {
      saida.set(cardId, {
        etiquetas: capa.etiquetas,
        membros: capa.membrosIds.map((id: string) => {
          const u = porUsuario.get(id);
          return { id, nome: u?.nome ?? "Usuário", avatarUrl: u?.avatarUrl ?? null };
        }),
      });
    }
    return saida;
  }, [capasQ.data, equipeQ.data]);
}
