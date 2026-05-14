import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Calendar, User } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolicitacoes, updateSolicitacao } from "@/lib/supabaseData";
import {
  STATUS_LABEL,
  FREQUENCIA_LABEL,
  type PipelineStatus,
  type Solicitacao,
} from "@/lib/types";
import { ScorePill } from "@/components/ScorePill";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

type StageId = "novo" | "em_analise" | "aceito" | "concluido";

type Stage = {
  id: StageId;
  label: string;
  /** Status that fall into this stage. */
  statuses: PipelineStatus[];
  /** Status assigned when a card is dropped on this stage. */
  target: PipelineStatus;
  accent?: boolean;
};

const STAGES: Stage[] = [
  { id: "novo", label: "Novo", statuses: ["novo"], target: "novo" },
  { id: "em_analise", label: "Em Análise", statuses: ["em_analise"], target: "em_analise" },
  {
    id: "aceito",
    label: "Em Desenvolvimento",
    statuses: ["em_desenvolvimento"],
    target: "em_desenvolvimento",
  },
  {
    id: "concluido",
    label: "Pronto",
    statuses: ["pronto"],
    target: "pronto",
    accent: true,
  },
];

export default function Kanban() {
  const all = useSupabaseData(() => listSolicitacoes(), []);
  const [items, setItems] = useState<Solicitacao[]>([]);

  useEffect(() => {
    setItems(all);
  }, [all]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const grouped = useMemo(() => {
    const map: Record<StageId, Solicitacao[]> = {
      novo: [],
      em_analise: [],
      aceito: [],
      concluido: [],
    };
    const sorted = [...items].sort((a, b) => b.score - a.score);
    for (const s of sorted) {
      const stage = STAGES.find((st) => st.statuses.includes(s.status));
      if (stage) map[stage.id].push(s);
    }
    return map;
  }, [items]);

  async function handleDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const stageId = e.over?.id as StageId | undefined;
    if (!stageId) return;
    const stage = STAGES.find((st) => st.id === stageId);
    const item = items.find((s) => s.id === id);
    if (!stage || !item) return;
    if (stage.statuses.includes(item.status)) return;
    const previous = items;
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, status: stage.target } : s)));
    try {
      await updateSolicitacao(id, { status: stage.target });
    } catch (err) {
      setItems(previous);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pipeline Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Arraste os cartões entre as colunas para atualizar o status.
        </p>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => (
            <Column key={stage.id} stage={stage} items={grouped[stage.id]} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, items }: { stage: Stage; items: Solicitacao[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card p-3 flex flex-col min-h-[300px] transition-colors",
        isOver ? "border-accent bg-accent/5" : "border-border",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              stage.accent ? "bg-accent" : "bg-muted-foreground/60",
            )}
            aria-hidden
          />
          <h3 className="text-sm font-medium">{stage.label}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="space-y-2 flex-1">
        {items.map((s) => <KanbanCard key={s.id} item={s} />)}
      </div>
    </div>
  );
}

function KanbanCard({ item }: { item: Solicitacao }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const data = new Date(item.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        navigate(`/demanda/${item.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/demanda/${item.id}`);
        }
      }}
      role="link"
      tabIndex={0}
      className={cn(
        "group rounded-md border border-border bg-background p-3 cursor-grab active:cursor-grabbing transition-shadow hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "shadow-lg opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {item.titulo}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <ScorePill score={item.score} />
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="size-3" />
          <span className="truncate max-w-[120px]">{item.solicitanteNome}</span>
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="size-3" />
          {data}
        </span>
      </div>

      <div className="mt-2">
        <Badge
          variant="outline"
          className="text-[10px] py-0 px-1.5 h-5 font-normal"
        >
          {FREQUENCIA_LABEL[item.frequencia]}
        </Badge>
        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">
          {STATUS_LABEL[item.status]}
        </span>
      </div>
    </div>
  );
}
