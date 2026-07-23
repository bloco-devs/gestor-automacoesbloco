import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ManagerShell } from "@/modules/manager-unified";

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
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <WorkspaceDemandasPage />
      </Suspense>
    </ManagerShell>
  );
}
