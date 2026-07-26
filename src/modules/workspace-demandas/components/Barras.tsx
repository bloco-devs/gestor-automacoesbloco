import { memo } from "react";
import { Columns3, GanttChart, List, Timer, Clock, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FILAS, type FilaId, type LenteId } from "@/domain/demand";

/**
 * As duas barras que sustentam `fila × lente = uma tela`.
 *
 * FILA  recorta QUAIS demandas (minhas, não atribuídas, em risco…)
 * LENTE decide COMO agrupar (status, janela de entrega, atividade)
 *
 * Elas ficam fixas e nunca somem — nem quando a lente é o Board. Era esse o
 * defeito que eu tinha contornado antes escondendo o cabeçalho no Board: a
 * moldura mudava, e por isso trocar de lente ainda parecia trocar de módulo.
 *
 * O filtro de texto vive aqui e é compartilhado pelas cinco lentes. Filtrar na
 * Lista e ir para o Board mantém o filtro, porque o contexto não mudou.
 */

export const LENTES: { id: LenteId; rotulo: string; icone: typeof List; ajuda: string }[] = [
  { id: "lista", rotulo: "Lista", icone: List, ajuda: "Agrupado por status" },
  { id: "board", rotulo: "Board", icone: Columns3, ajuda: "Colunas, com arrastar e soltar" },
  { id: "sprint", rotulo: "Sprint", icone: Timer, ajuda: "Agrupado por janela de entrega" },
  { id: "timeline", rotulo: "Timeline", icone: Clock, ajuda: "Agrupado por última movimentação" },
  { id: "gantt", rotulo: "Gantt", icone: GanttChart, ajuda: "Distribuição no calendário" },
];

export function isLenteId(v: string | null): v is LenteId {
  return !!v && LENTES.some((l) => l.id === v);
}

export function isFilaId(v: string | null): v is FilaId {
  return !!v && FILAS.some((f) => f.id === v);
}

// ---------------------------------------------------------------------------

interface FilaBarProps {
  fila: FilaId;
  onFila: (f: FilaId) => void;
  contagens: Record<FilaId, number>;
}

function FilaBarImpl({ fila, onFila, contagens }: FilaBarProps) {
  return (
    <nav aria-label="Fila" className="border-b border-border/50">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-1 overflow-x-auto px-5 py-1.5 md:px-8">
        {FILAS.map((f) => {
          const ativa = f.id === fila;
          return (
            <button
              key={f.id}
              type="button"
              aria-current={ativa ? "true" : undefined}
              title={f.ajuda}
              onClick={() => onFila(f.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] leading-5",
                "transition-colors duration-fast ease-standard",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                ativa ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.rotulo}
              {/* O número é a prévia do resultado: o usuário decide antes de clicar. */}
              <span className="tabular-nums text-muted-foreground/70">{contagens[f.id] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const FilaBar = memo(FilaBarImpl);

// ---------------------------------------------------------------------------

interface LenteBarProps {
  lente: LenteId;
  onLente: (l: LenteId) => void;
  busca: string;
  onBusca: (v: string) => void;
  total: number;
  filtradas: number;
}

function LenteBarImpl({ lente, onLente, busca, onBusca, total, filtradas }: LenteBarProps) {
  return (
    <div className="surface-glass sticky top-0 z-20 border-b">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2 md:px-8">
        <div role="tablist" aria-label="Visualização" className="flex items-center gap-0.5">
          {LENTES.map((l) => {
            const Icone = l.icone;
            const ativa = l.id === lente;
            return (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                title={l.ajuda}
                onClick={() => onLente(l.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] leading-5",
                  "transition-colors duration-fast ease-standard",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  ativa
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icone className="size-3.5" aria-hidden />
                {l.rotulo}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Filtrar demandas…"
            aria-label="Filtrar demandas"
            className="h-8 pl-8 pr-8 text-[13px]"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onBusca("")}
              aria-label="Limpar filtro"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">
          {busca ? `${filtradas} de ${total}` : `${total} demanda${total === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}

export const LenteBar = memo(LenteBarImpl);
