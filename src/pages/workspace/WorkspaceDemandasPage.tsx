import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/modules/workspace-unified";
import { SeletorDeProjeto } from "@/modules/workspace-demandas/components/SeletorDeProjeto";

const WorkspaceDemandas = lazy(() => import("@/modules/workspace-demandas/WorkspaceDemandas"));

/**
 * /workspace/demandas
 *
 *   sem :projetoId  → entra no projeto se houver só um; senão, mostra o seletor
 *   com :projetoId  → o workspace, com as cinco lentes sobre o mesmo conjunto
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
        {projetoId ? <WorkspaceDemandas /> : <SeletorDeProjeto />}
      </Suspense>
    </WorkspaceShell>
  );
}
