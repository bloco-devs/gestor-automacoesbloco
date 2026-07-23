import { Bell } from "lucide-react";
import { PortalShell } from "@/modules/portal-unified";

/**
 * Inbox do Solicitante — SOMENTE comunicação.
 * Nada de tarefas, KPIs, prioridades, IA, backlog ou cards.
 */
export default function PortalInboxPage() {
  return (
    <PortalShell>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-sm text-muted-foreground">
          Notificações, comentários, menções e aprovações relacionados às suas demandas.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-muted">
          <Bell className="size-4" aria-hidden />
        </span>
        <p className="text-sm font-medium">Nada novo por aqui.</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
          Quando alguém comentar, mencionar você ou responder uma demanda, o aviso aparece nesta
          lista.
        </p>
      </div>
    </PortalShell>
  );
}
