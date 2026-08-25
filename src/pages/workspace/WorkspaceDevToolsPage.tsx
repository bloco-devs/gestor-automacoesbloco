import { lazy, Suspense } from "react";
import { WorkspaceShell } from "@/modules/workspace-unified";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

const DeveloperCenter = lazy(() => import("@/pages/developer/Index"));

/**
 * DevTools — reutiliza o Developer Center existente sem alterações internas.
 */
export default function WorkspaceDevToolsPage() {
  return (
    <WorkspaceShell>
      <div className="h-full min-h-0 overflow-auto">
        <Suspense
          fallback={
          <div className="flex h-full items-center justify-center py-16">
            <BlinkCarregando tamanho="lg" mensagem="Carregando…" />
          </div>
        }>
          <DeveloperCenter />
        </Suspense>
      </div>
    </WorkspaceShell>
  );
}
