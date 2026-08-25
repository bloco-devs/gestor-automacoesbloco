import { lazy, Suspense } from "react";
import { ManagerShell } from "@/modules/manager-unified";
import { BlinkCarregando } from "@/components/blink/BlinkCarregando";

const Inbox = lazy(() => import("@/pages/Inbox"));

/**
 * /gestao/inbox — reutiliza a Inbox existente dentro do shell da Gestão.
 */
export default function ManagerInboxPage() {
  return (
    <ManagerShell>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center py-16">
            <BlinkCarregando mensagem="Carregando…" />
          </div>
        }>
        <Inbox />
      </Suspense>
    </ManagerShell>
  );
}
