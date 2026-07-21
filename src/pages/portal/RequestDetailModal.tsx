import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DemandTimeline } from "@/modules/demands/components/DemandTimeline";
import { SLAIndicator } from "@/modules/demands/components/SLAIndicator";
import { STATUS_COLUMNS, type Demand } from "@/modules/demands/types";

interface Props {
  demand: Demand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Visão simplificada do chamado para o solicitante.
 * A `DemandTimeline` já respeita RLS — notas internas ficam ocultas automaticamente.
 */
export function RequestDetailModal({ demand, open, onOpenChange }: Props) {
  const statusLabel = demand
    ? STATUS_COLUMNS.find((s) => s.id === demand.status)?.label ?? demand.status
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        {demand && (
          <>
            <DialogHeader className="p-6 pb-3 border-b border-border/60">
              <DialogTitle className="text-lg leading-tight pr-6">{demand.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant="outline">{statusLabel}</Badge>
                <SLAIndicator
                  slaDueAt={demand.sla_due_at}
                  slaStatus={demand.sla_status}
                  demandStatus={demand.status}
                  createdAt={demand.created_at}
                  size="md"
                />
                <span className="text-xs text-muted-foreground ml-auto">
                  Aberto em {new Date(demand.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-5">
                {demand.description && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Sua descrição
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{demand.description}</p>
                  </section>
                )}

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Andamento e mensagens
                  </h3>
                  <DemandTimeline demandId={demand.id} />
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
