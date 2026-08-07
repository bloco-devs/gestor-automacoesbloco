import { memo, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Section } from "@/design-system";
import { cn } from "@/lib/utils";
import { useReordenarFila } from "@/modules/demand-access/useReordenarFila";
import { ordensDaLista, reordenarLista } from "@/modules/workspace-demandas/ordenacao";
import TaskCard from "./TaskCard";
import type { RankedInboxItem } from "../types";
import EmptyInbox from "./EmptyInbox";

interface Props {
  items: RankedInboxItem[];
}

/**
 * Uma linha arrastável.
 *
 * O punho (`GripVertical`) é deliberado: a linha inteira é um botão que abre a
 * demanda, então deixar todo o corpo iniciar arrasto tornaria o clique
 * ambíguo. Com punho, arrastar e abrir são gestos diferentes.
 */
function LinhaArrastavel({ item }: { item: RankedInboxItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 bg-background",
        isDragging && "relative z-10 rounded-md shadow-md ring-1 ring-border",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reordenar ${item.title}`}
        className="shrink-0 cursor-grab rounded p-1 text-muted-foreground/50 transition-colors duration-fast hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <TaskCard item={item} />
      </div>
    </li>
  );
}

/**
 * DS 3.0 — sem Card em volta: um título de seção e uma lista separada por
 * hairline bastam. Isso remove um nível inteiro de caixa (card > card) que
 * era a principal fonte de ruído desta página.
 *
 * A ordem: por padrão vem do motor de prioridade, mas arrastar grava
 * `ordem_manual` e passa a mandar. A lista local reordena na hora (otimismo) e
 * a próxima leitura já vem na sequência certa do servidor.
 */
function TaskList({ items }: Props) {
  const [ordemLocal, setOrdemLocal] = useState<string[] | null>(null);
  const fila = useReordenarFila("solicitacoes", ["inbox", "solicitacoes"]);
  const sensores = useSensors(
    // 6px de folga: sem isso, um clique com tremor viraria arrasto.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const visiveis = useMemo(() => {
    if (!ordemLocal) return items;
    const porId = new Map(items.map((i) => [i.id, i]));
    const naOrdem = ordemLocal.map((id) => porId.get(id)).filter((i): i is RankedInboxItem => !!i);
    // Itens que apareceram depois do arrasto (realtime, refetch) entram no fim.
    const conhecidos = new Set(ordemLocal);
    return [...naOrdem, ...items.filter((i) => !conhecidos.has(i.id))];
  }, [items, ordemLocal]);

  const aoTerminar = (e: DragEndEvent) => {
    const alvo = e.over?.id ? String(e.over.id) : null;
    const ativo = String(e.active.id);
    if (!alvo || alvo === ativo) return;
    const ids = visiveis.map((i) => i.id);
    const nova = reordenarLista(ids, ativo, alvo);
    setOrdemLocal(nova);
    void fila.reordenar(ordensDaLista(nova));
  };

  return (
    <Section title="Minhas tarefas">
      {visiveis.length === 0 ? (
        <EmptyInbox message="Nenhuma tarefa atribuída no momento." />
      ) : (
        <DndContext
          sensors={sensores}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={aoTerminar}
        >
          <SortableContext
            items={visiveis.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="divide-y divide-border/50 border-y border-border/50" role="list">
              {visiveis.map((it) => (
                <LinhaArrastavel key={it.id} item={it} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </Section>
  );
}

export default memo(TaskList);
