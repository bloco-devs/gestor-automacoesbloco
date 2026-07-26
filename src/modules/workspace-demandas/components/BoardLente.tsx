import { memo, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import { PRIORIDADE_ROTULO, RISCO_ROTULO, type Capacidades, type Demanda, type Grupo } from "@/domain/demand";

/**
 * A lente de board.
 *
 * Escrita do zero sobre `Demanda`. Não importa nada de
 * `src/components/atividades/*` — nem `KanbanCard`, nem `Coluna`, nem
 * `BoardFilters`. Era a última dependência direta dos componentes herdados do
 * Trello dentro do Workspace.
 *
 * O cartão tem três linhas e ~64px, contra os ~150px do antigo: cabem 9–10 por
 * coluna em vez de 4. O que saiu não sumiu — chip de status virou a própria
 * coluna, e score virou ordenação (o mais urgente está no topo).
 *
 * Mover NÃO conhece tabela: chama `onMover`, que a camada de acesso traduz
 * para trocar coluna (quadro) ou trocar o enum de status (tickets).
 */

const COR_RISCO: Record<string, string> = {
  sla_estourado: "bg-destructive",
  atrasada: "bg-destructive",
  vence_hoje: "bg-warning",
  sla_atencao: "bg-warning",
  parada: "bg-warning/60",
  vence_em_breve: "bg-info",
};

function iniciais(nome: string): string {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function Cartao({
  demanda: d,
  capacidades,
  onAbrir,
  arrastavel,
  sobreposicao,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  onAbrir?: (id: string) => void;
  arrastavel: boolean;
  sobreposicao?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: d.id,
    disabled: !arrastavel || sobreposicao,
  });
  const responsavel = d.responsaveis[0];

  return (
    <div
      ref={sobreposicao ? undefined : setNodeRef}
      {...(sobreposicao ? {} : listeners)}
      {...(sobreposicao ? {} : attributes)}
      onClick={() => {
        if (isDragging || sobreposicao) return;
        onAbrir?.(d.id);
      }}
      role={sobreposicao ? undefined : "button"}
      tabIndex={sobreposicao ? undefined : 0}
      onKeyDown={(e) => {
        if (sobreposicao) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir?.(d.id);
        }
      }}
      aria-label={sobreposicao ? undefined : `Abrir demanda ${d.titulo}`}
      className={cn(
        "surface-raised rounded-lg px-2.5 py-2 outline-none",
        arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        isDragging && !sobreposicao && "opacity-30",
        sobreposicao && "surface-dragging",
        d.concluida && "opacity-60",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={cn("mt-0.5 h-8 w-[3px] shrink-0 rounded-full", d.risco ? COR_RISCO[d.risco] : "bg-transparent")}
          title={d.risco ? RISCO_ROTULO[d.risco] : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("line-clamp-2 text-[13px] font-medium leading-snug", d.concluida && "line-through")}>
            {d.titulo}
          </p>
          <div className="ds-caption mt-1 flex items-center gap-1.5 text-muted-foreground">
            <span className="truncate">
              {[d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null, d.sistema?.nome]
                .filter(Boolean)
                .join(" · ") || d.referencia}
            </span>
            {capacidades.ia && d.ia && (
              <Sparkles className="size-3 shrink-0 text-primary" aria-label="Atendida pela IA" />
            )}
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {capacidades.progresso && d.progresso && (
                <span className="tabular-nums">{d.progresso.percentual}%</span>
              )}
              {responsavel ? (
                <Avatar className="size-4" title={responsavel.nome}>
                  {responsavel.avatarUrl && <AvatarImage src={responsavel.avatarUrl} alt={responsavel.nome} />}
                  <AvatarFallback className="bg-muted text-[8px]">{iniciais(responsavel.nome)}</AvatarFallback>
                </Avatar>
              ) : (
                <span className="size-4 rounded-full border border-dashed border-border" title="Sem responsável" />
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Coluna({
  grupo,
  capacidades,
  onAbrir,
  arrastavel,
}: {
  grupo: Grupo;
  capacidades: Capacidades;
  onAbrir: (id: string) => void;
  arrastavel: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "surface-well flex max-h-[calc(100vh-16rem)] min-h-[16rem] w-[17rem] shrink-0 flex-col rounded-xl p-2",
        "transition-[box-shadow,background-color] duration-base ease-standard",
        isOver && "ring-2 ring-primary/50",
      )}
      aria-label={`${grupo.rotulo}, ${grupo.itens.length} demandas`}
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        <h2 className="ds-card-title truncate">{grupo.rotulo}</h2>
        <span className="ds-caption tabular-nums text-muted-foreground">{grupo.itens.length}</span>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto px-0.5 pb-1">
        {grupo.itens.map((d) => (
          <Cartao key={d.id} demanda={d} capacidades={capacidades} onAbrir={onAbrir} arrastavel={arrastavel} />
        ))}
        {grupo.itens.length === 0 && (
          <p className="ds-caption px-2 py-6 text-center text-muted-foreground/70">Vazio</p>
        )}
      </div>
    </section>
  );
}

interface Props {
  grupos: Grupo[];
  capacidades: Capacidades;
  onAbrir: (id: string) => void;
  onMover: (params: { demandaId: string; statusId: string }) => void;
  podeMover: boolean;
}

function BoardLenteImpl({ grupos, capacidades, onAbrir, onMover, podeMover }: Props) {
  const [arrastando, setArrastando] = useState<Demanda | null>(null);
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const porId = useMemo(() => {
    const m = new Map<string, Demanda>();
    for (const g of grupos) for (const d of g.itens) m.set(d.id, d);
    return m;
  }, [grupos]);

  if (grupos.length === 0) {
    return <EmptyPanel title="Sem colunas" description="Nenhuma demanda corresponde a esta fila." />;
  }

  const aoIniciar = (e: DragStartEvent) => setArrastando(porId.get(String(e.active.id)) ?? null);

  const aoTerminar = (e: DragEndEvent) => {
    setArrastando(null);
    const destino = e.over?.id ? String(e.over.id) : null;
    const demandaId = String(e.active.id);
    if (!destino) return;
    const atual = porId.get(demandaId);
    if (!atual || atual.status.id === destino) return;
    onMover({ demandaId, statusId: destino });
  };

  return (
    <DndContext sensors={sensores} onDragStart={aoIniciar} onDragEnd={aoTerminar} onDragCancel={() => setArrastando(null)}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {grupos.map((g) => (
          <Coluna key={g.id} grupo={g} capacidades={capacidades} onAbrir={onAbrir} arrastavel={podeMover} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastando ? (
          <div className="w-[16rem]">
            <Cartao demanda={arrastando} capacidades={capacidades} arrastavel sobreposicao />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export const BoardLente = memo(BoardLenteImpl);
