import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listBoardMembros } from "@/lib/atividadesBoards";

/**
 * Concluir um projeto.
 *
 * POR QUE ISSO NÃO É ARQUIVAR
 *
 * Arquivar tira da vista. Foi o próprio André quem apontou que os dois não se
 * confundem: "modulo AVD foi concluido, mas esta arquivado apenas para nao
 * atrapalhar visivelmente. os quadros de RPA ainda nao foram iniciados." Se a
 * data de arquivamento decidisse remuneração, o AVD entraria num ciclo pela
 * razão errada e um projeto que nem começou ficaria a um clique de virar
 * dinheiro.
 *
 * Então concluir é ação própria, com carimbo próprio (`concluido_em`), e ela
 * exige dizer QUEM trabalhou: os pontos da classificação são rateados entre os
 * responsáveis, e sem responsável não há a quem creditar. A RPC recusa lista
 * vazia de propósito.
 *
 * A ORDEM DA LISTA IMPORTA. Quando os pontos não dividem exato, o resto vai
 * para o primeiro. Com a escala atual (50/100/200) e dois responsáveis o resto
 * é sempre zero — a ordem existe para o dia em que forem três.
 */

export interface PessoaDoProjeto {
  id: string;
  nome: string;
  email: string;
}

/** Quem pode ser creditado: os membros do projeto. */
export function usePessoasDoProjeto(projetoId: string | null) {
  const q = useQuery({
    queryKey: ["atividades", "membros", projetoId],
    queryFn: async (): Promise<PessoaDoProjeto[]> => {
      if (!projetoId) return [];
      const membros = await listBoardMembros(projetoId);
      return membros.map((m) => ({ id: m.userId, nome: m.nome, email: m.email }));
    },
    enabled: !!projetoId,
    staleTime: 60_000,
  });
  return { pessoas: q.data ?? [], carregando: q.isLoading, erro: (q.error as Error) ?? null };
}

/**
 * Os carimbos de conclusão, por projeto.
 *
 * A view `atividades_boards_resumo`, que alimenta a lista, não expõe
 * `concluido_em` — ela é anterior a esta funcionalidade. Em vez de alterar a
 * view (outra migration, mais superfície), a lista lê os carimbos numa
 * consulta à parte e junta por id. O RLS devolve exatamente o mesmo conjunto
 * de projetos que a view já devolve para este usuário.
 */
export function useConclusoesDeProjeto() {
  const q = useQuery({
    queryKey: ["atividades", "conclusoes"],
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase
        .from("atividades_boards" as never)
        .select("id, concluido_em")
        .not("concluido_em", "is", null);
      if (error) throw new Error(error.message);
      const linhas = (data ?? []) as unknown as Array<{ id: string; concluido_em: string }>;
      return new Map(linhas.map((l) => [l.id, l.concluido_em]));
    },
    staleTime: 60_000,
  });
  return q.data ?? new Map<string, string>();
}

export function useConcluirProjeto() {
  const qc = useQueryClient();
  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["atividades"] });
    // A fila de classificação passa a ter (ou deixa de ter) este projeto.
    void qc.invalidateQueries({ queryKey: ["relatorio"] });
  };

  const concluir = useMutation({
    mutationFn: async (v: { projetoId: string; responsaveis: string[] }) => {
      const { data, error } = await supabase.rpc("relatorio_concluir_projeto" as never, {
        _projeto_id: v.projetoId,
        _responsaveis: v.responsaveis,
      } as never);
      // A RPC escreve as mensagens para quem lê — não traduzir de novo.
      if (error) throw new Error(error.message);
      return data as unknown as string;
    },
    onSuccess: invalidar,
  });

  const reabrir = useMutation({
    mutationFn: async (projetoId: string) => {
      const { error } = await supabase.rpc("relatorio_reabrir_projeto" as never, {
        _projeto_id: projetoId,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });

  return {
    concluir: (projetoId: string, responsaveis: string[]) =>
      concluir.mutateAsync({ projetoId, responsaveis }),
    reabrir: (projetoId: string) => reabrir.mutateAsync(projetoId),
    salvando: concluir.isPending || reabrir.isPending,
  };
}
