import { lazy, Suspense, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { listBoardsResumo } from "@/lib/atividadesBoards";

const Projetos = lazy(() => import("@/pages/Atividades"));

/**
 * Seletor de projeto de /workspace/demandas.
 *
 * O PROBLEMA QUE RESOLVE
 * Clicar em "Demandas" não mostrava demanda nenhuma: mostrava uma lista de
 * projetos com um único projeto dentro. Um clique que não decide nada — porque
 * não há alternativa — é um clique que só existe porque o roteador precisa
 * dele, não porque o usuário precisa.
 *
 * A regra: escolher só faz sentido quando há o que escolher. Com um projeto,
 * entra direto. Com dois ou mais, o seletor aparece.
 *
 * `replace` no Navigate é deliberado: sem ele, o botão Voltar traria o usuário
 * de volta ao seletor, que redirecionaria de novo — um laço.
 */
export function SeletorDeProjeto() {
  const projetosQ = useQuery({
    queryKey: ["atividades", "boards-resumo"],
    queryFn: listBoardsResumo,
    staleTime: 60_000,
  });

  const ativos = useMemo(
    () => (projetosQ.data ?? []).filter((p) => !p.arquivado),
    [projetosQ.data],
  );

  if (projetosQ.isLoading) {
    return (
      <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">Carregando projetos…</span>
      </div>
    );
  }

  if (ativos.length === 1) {
    return <Navigate to={`/workspace/demandas/${ativos[0].id}`} replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      }
    >
      <Projetos hrefBase="/workspace/demandas" />
    </Suspense>
  );
}
