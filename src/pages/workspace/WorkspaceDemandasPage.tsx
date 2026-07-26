import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/modules/workspace-unified";

const WorkspaceDemandas = lazy(() => import("@/modules/workspace-demandas/WorkspaceDemandas"));
const Atividades = lazy(() => import("@/pages/Atividades"));

/**
 * FEATURE 027 — /workspace/demandas
 *
 *   sem :projetoId  → seletor de projeto
 *   com :projetoId  → o workspace, com as cinco lentes sobre o mesmo conjunto
 *
 * Sem projeto na URL, o Workspace mostra a fila global do Help Desk. O seletor
 * de projeto continua sendo a página de quadros por enquanto — é o último
 * ponto do fluxo ainda ligado ao vocabulário do Trello, e está registrado no
 * relatório como o próximo a substituir.
 */
export default function WorkspaceDemandasPage() {
  const { projetoId } = useParams<{ projetoId: string }>();

  return (
    <WorkspaceShell>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center py-24" role="status" aria-live="polite">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Carregando…</span>
          </div>
        }
      >
        {projetoId ? <WorkspaceDemandas /> : <Atividades hrefBase="/workspace/demandas" />}
      </Suspense>
    </WorkspaceShell>
  );
}
