import { memo, useEffect, useMemo, useState } from "react";
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
import { ChevronRight, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { EmptyPanel } from "@/design-system";
import {
  PRIORIDADE_ROTULO,
  RISCO_ROTULO,
  type Capacidades,
  type Demanda,
  type Grupo,
  type SinaisUteis,
} from "@/domain/demand";

/**
 * A lente de board.
 *
 * Escrita do zero sobre `Demanda`. Não importa nada de
 * `src/components/atividades/*` — nem `KanbanCard`, nem `Coluna`, nem
 * `BoardFilters`. Era a última dependência direta dos componentes herdados do
 * Trello dentro do Workspace.
 *
 * Mover NÃO conhece tabela: chama `onMover`, que a camada de acesso traduz
 * para trocar coluna (quadro) ou trocar o enum de status (tickets).
 *
 * DOIS FILTROS SOBRE O QUE DESENHAR — os mesmos da Lista, pelo mesmo motivo
 *   `capacidades` — a fonte sabe o que é isso?
 *   `sinais`      — isso separa um cartão do outro aqui, agora?
 * Sem o segundo, o cartão imprimia a prioridade sempre: 36 cartões dizendo
 * "Média" gastavam uma linha cada para não informar nada. Quando não sobra
 * nada distintivo para dizer, o cartão perde o rodapé e fica com duas linhas.
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
  sinais,
  onAbrir,
  arrastavel,
  sobreposicao,
}: {
  demanda: Demanda;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir?: (id: string) => void;
  arrastavel: boolean;
  sobreposicao?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: d.id,
    disabled: !arrastavel || sobreposicao,
  });
  const responsavel = d.responsaveis[0];

  const meta = [
    sinais.prioridade && d.prioridade ? PRIORIDADE_ROTULO[d.prioridade] : null,
    sinais.sistema ? (d.sistema?.nome ?? null) : null,
    sinais.referencia ? d.referencia : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const direita = (
    <span className="ds-caption flex shrink-0 items-center gap-1.5 text-muted-foreground">
      {capacidades.ia && d.ia && (
        <Sparkles className="size-3 shrink-0 text-primary" aria-label="Atendida pela IA" />
      )}
      {capacidades.progresso && sinais.progresso && d.progresso && (
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
  );

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
        "surface-raised rounded-md px-2 py-1.5 outline-none",
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
          <div className="flex items-start gap-2">
            <p
              className={cn(
                "line-clamp-2 min-w-0 flex-1 text-[13px] font-medium leading-snug",
                d.concluida && "line-through",
              )}
            >
              {d.titulo}
            </p>
            {/* Sem rodapé, os sinais sobem para a linha do título em vez de
                abrirem uma segunda linha só para eles. */}
            {!meta && direita}
          </div>
          {meta && (
            <div className="ds-caption mt-1 flex items-center gap-1.5 text-muted-foreground">
              <span className="truncate">{meta}</span>
              <span className="ml-auto">{direita}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A coluna recolhida.
 *
 * Não é uma coluna escondida: continua sendo alvo de drop, continua mostrando
 * o rótulo e a contagem, e volta com um clique. O que ela deixa de gastar é
 * largura — que num board é o recurso escasso, porque a rolagem horizontal
 * esconde trabalho em curso atrás de trabalho terminado.
 */
function ColunaRecolhida({ grupo, onExpandir }: { grupo: Grupo; onExpandir: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onExpandir}
      aria-label={`Mostrar ${grupo.rotulo}, ${grupo.itens.length} demandas`}
      className={cn(
        "surface-well flex max-h-[calc(100vh-8rem)] min-h-[16rem] w-11 shrink-0 flex-col items-center gap-2 rounded-lg py-3",
        "text-muted-foreground transition-colors duration-base ease-standard",
        "hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        isOver && "ring-2 ring-primary/50",
      )}
    >
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
      <span className="ds-caption tabular-nums font-medium text-foreground">{grupo.itens.length}</span>
      <span className="ds-caption whitespace-nowrap" style={{ writingMode: "vertical-rl" }}>
        {grupo.rotulo}
      </span>
    </button>
  );
}

function Coluna({
  grupo,
  capacidades,
  sinais,
  onAbrir,
  arrastavel,
  onRecolher,
}: {
  grupo: Grupo;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  arrastavel: boolean;
  onRecolher?: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: grupo.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "surface-well flex max-h-[calc(100vh-8rem)] min-h-[16rem] w-[16rem] shrink-0 flex-col rounded-lg p-1.5",
        "transition-[box-shadow,background-color] duration-base ease-standard",
        isOver && "ring-2 ring-primary/50",
      )}
      aria-label={`${grupo.rotulo}, ${grupo.itens.length} demandas`}
    >
      <header className="flex items-center gap-2 px-1 pb-2">
        <h2 className="ds-card-title truncate">{grupo.rotulo}</h2>
        <span className="ds-caption tabular-nums text-muted-foreground">{grupo.itens.length}</span>
        {onRecolher && (
          <button
            type="button"
            onClick={onRecolher}
            aria-label={`Recolher ${grupo.rotulo}`}
            className="ml-auto rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ChevronRight className="size-3.5 rotate-180" aria-hidden />
          </button>
        )}
      </header>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-0.5 pb-1">
        {grupo.itens.map((d) => (
          <Cartao
            key={d.id}
            demanda={d}
            capacidades={capacidades}
            sinais={sinais}
            onAbrir={onAbrir}
            arrastavel={arrastavel}
          />
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
  sinais: SinaisUteis;
  onAbrir: (id: string) => void;
  onMover: (params: { demandaId: string; statusId: string }) => void;
  podeMover: boolean;
}

function BoardLenteImpl({ grupos, capacidades, sinais, onAbrir, onMover, podeMover }: Props) {
  const [arrastando, setArrastando] = useState<Demanda | null>(null);
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set());
  const [jaVistas, setJaVistas] = useState<Set<string>>(new Set());
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  /**
   * Colunas concluídas começam recolhidas — mas só na primeira vez que
   * aparecem. Depois disso a escolha é do usuário: recolher de novo o que ele
   * acabou de abrir seria a tela discordando dele a cada re-render.
   */
  useEffect(() => {
    const novas = grupos.filter((g) => g.concluido && !jaVistas.has(g.id)).map((g) => g.id);
    if (novas.length === 0) return;
    setRecolhidas((r) => new Set([...r, ...novas]));
    setJaVistas((v) => new Set([...v, ...novas]));
  }, [grupos, jaVistas]);

  const porId = useMemo(() => {
    const m = new Map<string, Demanda>();
    for (const g of grupos) for (const d of g.itens) m.set(d.id, d);
    return m;
  }, [grupos]);

  if (grupos.length === 0) {
    return <EmptyPanel title="Sem colunas" description="Nenhuma demanda corresponde a esta fila." />;
  }

  const alternar = (id: string) =>
    setRecolhidas((r) => {
      const p = new Set(r);
      if (p.has(id)) p.delete(id);
      else p.add(id);
      return p;
    });

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
      <div className="flex gap-2 overflow-x-auto pb-2">
        {grupos.map((g) =>
          recolhidas.has(g.id) ? (
            <ColunaRecolhida key={g.id} grupo={g} onExpandir={() => alternar(g.id)} />
          ) : (
            <Coluna
              key={g.id}
              grupo={g}
              capacidades={capacidades}
              sinais={sinais}
              onAbrir={onAbrir}
              arrastavel={podeMover}
              onRecolher={g.concluido ? () => alternar(g.id) : undefined}
            />
          ),
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {arrastando ? (
          <div className="w-[16rem]">
            <Cartao demanda={arrastando} capacidades={capacidades} sinais={sinais} arrastavel sobreposicao />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export const BoardLente = memo(BoardLenteImpl);
