import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/modules/workspace-unified";

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
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <DeveloperCenter />
        </Suspense>
      </div>
    </WorkspaceShell>
  );
}
