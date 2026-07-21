import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useDeleteDemand, useDemands, useUpdateDemandStatus } from "../hooks";
import { STATUS_COLUMNS, type Demand, type DemandStatus } from "../types";
import { DemandCard } from "./DemandCard";
import { DemandDetailDialog } from "./DemandDetailDialog";

export function KanbanBoard() {
  const { data: demands = [], isLoading } = useDemands();
  const updateStatus = useUpdateDemandStatus();
  const remove = useDeleteDemand();
  const { user } = useAuth();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<DemandStatus, Demand[]>();
    STATUS_COLUMNS.forEach((c) => m.set(c.id, []));
    for (const d of demands) m.get(d.status)?.push(d);
    return m;
  }, [demands]);

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
