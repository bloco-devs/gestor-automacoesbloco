import { lazy, Suspense } from "react";
import { ManagerShell } from "@/modules/manager-unified";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

/**
 * /gestao/demandas — reutiliza EXATAMENTE a mesma página de demandas do Workspace.
 * Nenhuma segunda implementação. O que muda é apenas o shell ao redor.
 */
const WorkspaceDemandasPage = lazy(() => import("@/pages/workspace/WorkspaceDemandasPage"));

export default function ManagerDemandasPage() {
  return (
    <ManagerShell>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center py-16">
            <BlinkCarregando mensagem="Carregando…" />
          </div>
        }>
        <WorkspaceDemandasPage />
      </Suspense>
    </ManagerShell>
  );
}
