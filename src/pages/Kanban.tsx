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
import { AlertTriangle, CalendarDays } from "lucide-react";
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
      console.error("Kanban updateSolicitacao", err);
      setItems(previous);
      toast.error("Não foi possível atualizar o status", {
        description: "Verifique sua permissão e tente novamente.",
      });
    }
  }

  const total = items.length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pipeline Kanban</h1>
          <p className="text-sm text-muted-foreground">
            Arraste os cartões entre as colunas para atualizar o status.
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {total} {total === 1 ? "demanda" : "demandas"}
        </span>
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
        <div className="-mx-1 flex min-h-0 flex-1 gap-3 overflow-x-auto px-1 pb-3">
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
    <section
      ref={setNodeRef}
      aria-label={stage.label}
      className={cn(
        "flex w-[280px] shrink-0 flex-col rounded-xl border bg-muted/40 transition-colors",
        isOver ? "border-accent bg-accent/5" : "border-border/70",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            stage.accent ? "bg-accent" : "bg-muted-foreground/50",
          )}
          aria-hidden
        />
        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {stage.label}
        </h3>
        <FieldHelp className="shrink-0">{STAGE_HELP[stage.id]}</FieldHelp>
        <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </header>

      <div className="flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8">
            <span className="text-xs text-muted-foreground">Nenhum cartão</span>
          </div>
        ) : (
          items.map((s) => <KanbanCard key={s.id} item={s} />)
        )}
      </div>
    </section>
  );
}

function initials(nome: string) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
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
    <article
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
        "group cursor-grab rounded-lg border border-border/70 bg-card p-3 shadow-sm transition-all active:cursor-grabbing",
        "hover:border-accent/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "rotate-1 opacity-80 shadow-lg",
      )}
    >
      <p className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground transition-colors group-hover:text-accent">
        {item.titulo}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
          {freqLabel(item.frequencia)}
        </Badge>
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
          {STATUS_LABEL[item.status]}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span
            className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-semibold uppercase text-muted-foreground"
            title={item.solicitanteNome}
            aria-hidden
          >
            {initials(item.solicitanteNome) || "?"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden />
            {data}
          </span>
        </div>
        <ScorePill score={item.score} />
      </div>
    </article>
  );
}

