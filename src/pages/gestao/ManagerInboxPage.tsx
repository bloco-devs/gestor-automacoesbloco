import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ManagerShell } from "@/modules/manager-unified";

const Inbox = lazy(() => import("@/pages/Inbox"));

/**
 * /gestao/inbox — reutiliza a Inbox existente dentro do shell da Gestão.
 */
export default function ManagerInboxPage() {
  return (
    <ManagerShell>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Inbox />
      </Suspense>
    </ManagerShell>
  );
}
