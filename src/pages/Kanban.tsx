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
import { AlertTriangle, Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listSolicitacoes, updateSolicitacao } from "@/lib/supabaseData";
import {
  STATUS_LABEL,
  freqLabel,
  type PipelineStatus,
  type Solicitacao,
} from "@/lib/types";
import { ScorePill } from "@/components/ScorePill";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldHelp } from "@/components/FieldHelp";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

type StageId =
  | "novo"
  | "em_analise"
  | "aprovado"
  | "em_desenvolvimento"
  | "testando"
  | "pronto"
  | "em_producao";

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
  { id: "novo", label: STATUS_LABEL.novo, statuses: ["novo"], target: "novo" },
  { id: "em_analise", label: STATUS_LABEL.em_analise, statuses: ["em_analise"], target: "em_analise" },
  { id: "aprovado", label: STATUS_LABEL.aprovado, statuses: ["aprovado"], target: "aprovado" },
  { id: "em_desenvolvimento", label: STATUS_LABEL.em_desenvolvimento, statuses: ["em_desenvolvimento"], target: "em_desenvolvimento" },
  { id: "testando", label: STATUS_LABEL.testando, statuses: ["testando"], target: "testando" },
  { id: "pronto", label: STATUS_LABEL.pronto, statuses: ["pronto"], target: "pronto", accent: true },
  { id: "em_producao", label: STATUS_LABEL.em_producao, statuses: ["em_producao"], target: "em_producao", accent: true },
];

const STAGE_HELP: Record<StageId, string> = {
  novo: "Demanda recém cadastrada, aguardando triagem.",
  em_analise: "O desenvolvedor está avaliando viabilidade e complexidade.",
  aprovado: "Demanda aprovada, aguardando início do desenvolvimento.",
  em_desenvolvimento: "Solução já está sendo construída pelo time de tecnologia.",
  testando: "Solução em fase de testes/validação.",
  pronto: "Solução entregue, aguardando publicação.",
  em_producao: "Solução em uso em produção.",
};

export default function Kanban() {
  const { data, loading, error, refetch } = useSupabaseQuery(() => listSolicitacoes(), []);
  const all = useMemo(() => data ?? [], [data]);
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
      aprovado: [],
      em_desenvolvimento: [],
      testando: [],
      pronto: [],
      em_producao: [],
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

      {error && (
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refetch}>
              Tentar novamente
            </Button>
          }
        />
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage) => (
            <Column key={stage.id} stage={stage} items={grouped[stage.id]} loading={loading} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({ stage, items, loading }: { stage: Stage; items: Solicitacao[]; loading: boolean }) {
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
          <FieldHelp>{STAGE_HELP[stage.id]}</FieldHelp>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <div className="space-y-2 flex-1">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">Nenhum cartão</div>
        ) : (
          items.map((s) => <KanbanCard key={s.id} item={s} />)
        )}
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
        navigate(`/solicitacao/${item.id}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/solicitacao/${item.id}`);
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
          {freqLabel(item.frequencia)}
        </Badge>
        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground/80">
          {STATUS_LABEL[item.status]}
        </span>
      </div>
    </div>
  );
}
