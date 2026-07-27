import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateDemandDialog, KanbanBoard } from "@/modules/demands";

export default function Demandas() {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Board de Demandas</h1>
          <p className="text-sm text-muted-foreground">
            Gestão visual de demandas, tickets e melhorias em um único quadro.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-2" />
          Nova demanda
        </Button>
      </header>
      <KanbanBoard />
      <CreateDemandDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
