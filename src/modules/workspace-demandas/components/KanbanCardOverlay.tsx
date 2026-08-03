/**
 * Overlay do cartão sendo arrastado — física estilo Trello.
 *
 * Responsabilidades DESTE componente:
 *   • Envolver o `<DragOverlay>` do dnd-kit
 *   • Aplicar as classes de elevação e inclinação (scale, rotate, shadow)
 *   • Garantir `cursor-grabbing` em todo o overlay
 *
 * Responsabilidades FORA deste componente:
 *   • Toda a lógica de drag-and-drop (sensores, handlers, atualização no banco)
 *     permanece no `BoardLente` sem nenhuma alteração.
 */
import { DragOverlay } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  tomDaEtapa,
  type Capacidades,
  type Demanda,
  type Grupo,
  type SinaisUteis,
} from "@/domain/demand";
import type { CapasResolvidas } from "@/modules/demand-access";
import { Cartao } from "./KanbanCard";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface KanbanCardOverlayProps {
  /** Demanda atualmente em voo; `null` quando nenhuma está sendo arrastada. */
  arrastando: Demanda | null;
  capacidades: Capacidades;
  sinais: SinaisUteis;
  /** Grupos do board — necessários para descobrir o tom (cor da borda) do cartão. */
  grupos: Grupo[];
  emProjeto?: boolean;
  /** Capas (etiquetas e membros) — opcional, igual ao cartão estático. */
  capas?: CapasResolvidas;
}

// ─── Componente ───────────────────────────────────────────────────────────────

/**
 * Renderiza o cartão "em voo" com a física do Trello:
 *
 *   `scale-105`                 → cresce ~5 %, sai da grade, ilusão de elevação
 *   `rotate-2`                  → inclina 2° à direita (mão que pega papel)
 *   `shadow-2xl`                → sombra profunda, contextualiza a elevação
 *   `cursor-grabbing`           → mão fechada em todo o overlay
 *   `transition-transform …`   → entrada suave, não um salto abrupto
 *
 * `dropAnimation={null}` suprime a animação de retorno ao soltar, que na
 * maioria dos casos é mais confusa do que útil em boards densos.
 */
export function KanbanCardOverlay({
  arrastando,
  capacidades,
  sinais,
  grupos,
  emProjeto,
  capas,
}: KanbanCardOverlayProps) {
  return (
    <DragOverlay dropAnimation={null}>
      {arrastando ? (
        <div
          className={cn(
            "w-[17rem]",
            // ELEVAÇÃO E INCLINAÇÃO — o cartão "sai da mesa"
            "scale-105 rotate-2",
            "shadow-2xl",
            "cursor-grabbing",
            // O overlay segue o cursor. Se ele capturar evento de ponteiro,
            // fica entre o cursor e os alvos — e o `pointerWithin` passa a
            // encontrar o próprio overlay em vez da coluna embaixo.
            "pointer-events-none",
            // Entrada suave ao iniciar o arrasto
            "transition-transform duration-200 ease-out",
            "z-[9999]",
          )}
        >
          <Cartao
            demanda={arrastando}
            capacidades={capacidades}
            sinais={sinais}
            arrastavel
            sobreposicao
            emProjeto={emProjeto}
            capa={capas?.get(arrastando.id)}
            tom={tomDaEtapa(
              grupos.find((g) => g.itens.some((i) => i.id === arrastando.id))?.rotulo ?? "",
            )}
          />
        </div>
      ) : null}
    </DragOverlay>
  );
}
