import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Flame } from "lucide-react";
import { useStoreSubscription } from "@/hooks/useStore";
import { listSolicitacoes, updateSolicitacao } from "@/lib/store";
import { PIPELINE_ORDER, STATUS_LABEL, type PipelineStatus, type Solicitacao } from "@/lib/types";
import { ScorePill } from "@/components/ScorePill";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Kanban() {
  const all = useStoreSubscription(() => listSolicitacoes());
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const grouped = useMemo(() => {
    const map: Record<PipelineStatus, Solicitacao[]> = {
      novo: [], em_analise: [], aprovado: [], em_desenvolvimento: [], testando: [], pronto: [], em_producao: [],
    };
    for (const s of [...all].sort((a, b) => b.score - a.score)) map[s.status].push(s);
    return map;
  }, [all]);

  function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const newStatus = e.over?.id as PipelineStatus | undefined;
    if (!newStatus) return;
    const item = all.find((s) => s.id === id);
    if (!item || item.status === newStatus) return;
    updateSolicitacao(id, { status: newStatus });
    toast({ title: "Status atualizado", description: `${item.titulo} → ${STATUS_LABEL[newStatus]}` });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Kanban</h1>
        <p className="text-sm text-muted-foreground">Arraste os cartões entre as colunas para atualizar o status.</p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 snap-x">
          {PIPELINE_ORDER.map((status) => (
            <Column key={status} status={status} items={grouped[status]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ status, items }: { status: PipelineStatus; items: Solicitacao[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-72 shrink-0 snap-start rounded-lg border bg-card p-3 flex flex-col transition-colors",
        isOver ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-medium">{STATUS_LABEL[status]}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
      </div>
      <div className="space-y-2 min-h-32">
        {items.map((s) => (
          <Card key={s.id} item={s} />
        ))}
      </div>
    </div>
  );
}

function Card({ item }: { item: Solicitacao }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group rounded-md border border-border bg-background p-3 cursor-grab active:cursor-grabbing transition-shadow",
        isDragging && "shadow-lg opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/demanda/${item.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-sm font-medium leading-snug line-clamp-2 hover:text-accent transition-colors"
        >
          {item.titulo}
        </Link>
        <ScorePill score={item.score} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{item.solicitanteNome}</span>
        <span className="flex items-center gap-1" title={`Complexidade ${item.complexidade}/5`}>
          <Flame className="size-3 text-accent" />
          {item.complexidade}/5
        </span>
      </div>
    </div>
  );
}
