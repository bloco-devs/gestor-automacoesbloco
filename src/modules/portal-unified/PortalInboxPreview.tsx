import { Link } from "react-router-dom";
import { ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Preview leve do Inbox — no Portal, o Inbox é apenas comunicação
 * (notificações, comentários, menções). Nada de KPIs/tarefas/IA.
 */
export function PortalInboxPreview() {
  return (
    <section aria-label="Inbox" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Inbox</h2>
        <Button asChild variant="ghost" size="sm">
          <Link to="/portal/inbox">
            Abrir <ArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>
      <Link
        to="/portal/inbox"
        className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition hover:bg-muted/50"
      >
        <span className="grid size-9 place-items-center rounded-full bg-muted">
          <Bell className="size-4" />
        </span>
        <span className="flex-1 text-muted-foreground">
          Notificações, comentários e menções sobre suas demandas.
        </span>
      </Link>
    </section>
  );
}
