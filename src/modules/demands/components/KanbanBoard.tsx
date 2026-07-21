import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownWideNarrow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useDeleteDemand, useDemands, useUpdateDemandStatus } from "../hooks";
import { STATUS_COLUMNS, type Demand, type DemandStatus } from "../types";
import { DemandCard } from "./DemandCard";
import { DemandDetailDialog } from "./DemandDetailDialog";
import { computeSlaView } from "./SLAIndicator";

export function KanbanBoard() {
  const { data: demands = [], isLoading } = useDemands();
  const updateStatus = useUpdateDemandStatus();
  const remove = useDeleteDemand();
  const { user } = useAuth();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);
  const [sortByUrgency, setSortByUrgency] = useState(false);

  const grouped = useMemo(() => {
    const now = Date.now();
    const m = new Map<DemandStatus, Demand[]>();
    STATUS_COLUMNS.forEach((c) => m.set(c.id, []));
    const filtered = onlyAtRisk
      ? demands.filter((d) => {
          const v = computeSlaView(d.sla_due_at, d.sla_status, d.status, d.created_at, now);
          return v.kind === "warning" || v.kind === "overdue";
        })
      : demands;
    for (const d of filtered) m.get(d.status)?.push(d);
    if (sortByUrgency) {
      for (const [k, list] of m) {
        list.sort((a, b) => {
          const va = computeSlaView(a.sla_due_at, a.sla_status, a.status, a.created_at, now).ms;
          const vb = computeSlaView(b.sla_due_at, b.sla_status, b.status, b.created_at, now).ms;
          return va - vb;
        });
        m.set(k, list);
      }
    }
    return m;
  }, [demands, onlyAtRisk, sortByUrgency]);

  const activeDemand = useMemo(
    () => demands.find((d) => d.id === openId) ?? null,
    [demands, openId],
  );

  const handleStatusChange = (id: string, status: DemandStatus) => {
    updateStatus.mutate({ id, status });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta demanda?")) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Demanda excluída" });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao excluir",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button
          size="sm"
          variant={onlyAtRisk ? "default" : "outline"}
          onClick={() => setOnlyAtRisk((v) => !v)}
          className="gap-1.5"
        >
          <AlertTriangle className="size-3.5" />
          Em Risco de SLA
        </Button>
        <Button
          size="sm"
          variant={sortByUrgency ? "default" : "outline"}
          onClick={() => setSortByUrgency((v) => !v)}
          className="gap-1.5"
        >
          <ArrowDownWideNarrow className="size-3.5" />
          Ordenar por Urgência
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STATUS_COLUMNS.map((col) => {
          const items = grouped.get(col.id) ?? [];
          return (
            <div
              key={col.id}
              className={cn(
                "rounded-xl border border-border bg-muted/30 p-2 flex flex-col min-h-[300px] max-h-[calc(100vh-220px)]",
              )}
            >
              <div className="flex items-center justify-between px-2 py-1.5 mb-2 border-b border-border/60">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="space-y-2 flex-1 overflow-y-auto px-1 pb-1">
                {isLoading && (
                  <p className="text-xs text-muted-foreground text-center py-4">Carregando…</p>
                )}
                {!isLoading && items.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem demandas</p>
                )}
                {items.map((d) => (
                  <DemandCard
                    key={d.id}
                    demand={d}
                    onStatusChange={(s) => handleStatusChange(d.id, s)}
                    onDelete={() => handleDelete(d.id)}
                    onOpen={() => setOpenId(d.id)}
                    canDelete={
                      d.created_by === user?.id || !!user?.isAdministrador
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <DemandDetailDialog
        demand={activeDemand}
        open={!!activeDemand}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}
