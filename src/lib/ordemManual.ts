import { supabase } from "@/integrations/supabase/client";
import type { PosicaoNaFila } from "@/modules/workspace-demandas/ordenacao";

/**
 * A ordem manual das filas que não têm coluna de posição própria.
 *
 * O quadro grava posição pela RPC transacional `atividades_reorder_cards`. As
 * duas caixas de entrada (`demands` e `solicitacoes`) não tinham nada: a ordem
 * era sempre derivada (SLA, chegada, score). O campo `ordem_manual` existe para
 * quem arrasta poder discordar dessa derivação — e a escolha vale para todos.
 *
 * `upsert` não serve aqui: as duas tabelas têm colunas obrigatórias sem valor
 * padrão, então um upsert parcial recriaria linha em vez de atualizar. São
 * updates por id, em paralelo, sobre listas do tamanho de uma coluna.
 */
export type FilaOrdenavel = "demands" | "solicitacoes";

export async function salvarOrdemManual(
  tabela: FilaOrdenavel,
  itens: PosicaoNaFila[],
): Promise<void> {
  if (itens.length === 0) return;
  const erros = await Promise.all(
    itens.map(async ({ id, ordem }) => {
      // `.select("id")` não é decoração: RLS negando um UPDATE devolve SUCESSO
      // com zero linhas. Sem contar as linhas, a fila era reordenada só na
      // tela e voltava ao lugar no próximo refetch — em silêncio.
      const { data, error } = await supabase
        .from(tabela as never)
        .update({ ordem_manual: ordem } as never)
        .eq("id", id)
        .select("id");
      if (error) return error;
      if (!data || (data as unknown[]).length === 0) {
        return new Error(
          "Não foi possível reordenar esta fila. Você pode não ter permissão para alterá-la.",
        );
      }
      return null;
    }),
  );
  const primeiro = erros.find((e) => e);
  if (primeiro) throw primeiro;
}


export { ordenarPorOrdemManual } from "@/modules/workspace-demandas/ordenacao";
