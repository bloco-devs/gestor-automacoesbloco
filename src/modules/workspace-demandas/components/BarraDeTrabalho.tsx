import { memo } from "react";
import { Columns3, GanttChart, List, Timer, Clock, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FILAS, type FilaId, type LenteId } from "@/domain/demand";

/**
 * `fila × lente` numa faixa só, de 40px.
 *
 * ERAM DUAS BARRAS. POR QUE VIRARAM UMA
 * Fila e lente são dois parâmetros da mesma pergunta — "o que eu vejo e como
 * eu vejo" — e nunca são usados isoladamente. Em duas faixas empilhadas elas
 * pareciam dois níveis de navegação, o que é falso: nenhuma contém a outra.
 * Juntas, a leitura é uma frase: *todas · em board · filtrando por "certidão"*.
 *
 * DECISÕES DE DENSIDADE
 * - Lentes viram ícone. São cinco, sempre as mesmas, e o rótulo só ensina na
 *   primeira semana — o tooltip continua ensinando sem cobrar largura para
 *   sempre. A ativa ganha fundo, não só cor, porque cor sozinha falha para
 *   quem não distingue as duas.
 * - Fila com zero perde o número, não some. Sumir tiraria a informação de que
 *   ela existe; mostrar "0" gasta o mesmo espaço de um número que importa.
 *   "Em risco" sem número lê-se como "não há", que é a verdade e é boa notícia.
 * - O contador da direita só aparece quando há filtro ativo. Fora disso ele
 *   repetiria o número que já está na aba da fila selecionada.
 */

export const LENTES: { id: LenteId; rotulo: string; icone: typeof List; ajuda: string }[] = [
  { id: "lista", rotulo: "Lista", icone: List, ajuda: "Lista — agrupada por status" },
  { id: "board", rotulo: "Board", icone: Columns3, ajuda: "Board — colunas, com arrastar e soltar" },
  { id: "sprint", rotulo: "Sprint", icone: Timer, ajuda: "Sprint — agrupada por janela de entrega" },
  { id: "timeline", rotulo: "Timeline", icone: Clock, ajuda: "Timeline — agrupada por última movimentação" },
  { id: "gantt", rotulo: "Gantt", icone: GanttChart, ajuda: "Gantt — distribuição no calendário" },
];

export function isLenteId(v: string | null): v is LenteId {
  return !!v && LENTES.some((l) => l.id === v);
}

export function isFilaId(v: string | null): v is FilaId {
  return !!v && FILAS.some((f) => f.id === v);
}

interface Props {
  fila: FilaId;
  onFila: (f: FilaId) => void;
  contagens: Record<FilaId, number>;
  lente: LenteId;
  onLente: (l: LenteId) => void;
  busca: string;
  onBusca: (v: string) => void;
  total: number;
  filtradas: number;
}

function BarraDeTrabalhoImpl({
  fila,
  onFila,
  contagens,
  lente,
  onLente,
  busca,
  onBusca,
  total,
  filtradas,
}: Props) {
  return (
    <div className="surface-glass sticky top-0 z-20 border-b">
      <div className="flex h-10 w-full items-center gap-1 px-4 md:px-6">
        <nav aria-label="Fila" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
          {FILAS.map((f) => {
            const ativa = f.id === fila;
            const n = contagens[f.id];
            return (
              <button
                key={f.id}
                type="button"
                aria-current={ativa ? "true" : undefined}
                title={f.ajuda}
                onClick={() => onFila(f.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] leading-4",
                  "transition-colors duration-fast ease-standard",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  ativa
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                {f.rotulo}
                {n > 0 && <span className="tabular-nums opacity-60">{n}</span>}
              </button>
            );
          })}
        </nav>

        <span className="mx-1.5 h-4 w-px shrink-0 bg-border" aria-hidden />

        <div role="tablist" aria-label="Visualização" className="flex shrink-0 items-center gap-0.5">
          {LENTES.map((l) => {
            const Icone = l.icone;
            const ativa = l.id === lente;
            return (
              <Tooltip key={l.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={ativa}
                    aria-label={l.rotulo}
                    onClick={() => onLente(l.id)}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md",
                      "transition-colors duration-fast ease-standard",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      ativa
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icone className="size-4" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{l.ajuda}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="relative ml-auto w-40 shrink-0 lg:w-56">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Filtrar…"
            aria-label="Filtrar demandas"
            className="h-7 border-transparent bg-muted/40 pl-8 pr-7 text-[13px]"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onBusca("")}
              aria-label="Limpar filtro"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {busca && (
          <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">
            {filtradas} de {total}
          </span>
        )}
      </div>
    </div>
  );
}

export const BarraDeTrabalho = memo(BarraDeTrabalhoImpl);
