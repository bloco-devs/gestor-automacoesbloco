import { memo, useState, type ReactNode } from "react";
import { Activity, CalendarRange, Columns3, GanttChart, Search, Tag, Users, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { labelColorStyle } from "@/lib/atividades";
import { FILAS, type FilaId, type LenteId } from "@/domain/demand";

/**
 * `fila x lente` numa faixa só, de 40px.
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
 *
 * FILTROS DE MEMBRO E ETIQUETA
 * Aparecem apenas no escopo de projeto (`membrosDisponiveis.length > 0` ou
 * `etiquetasDisponiveis.length > 0`). Na Inbox as capas não existem (fonte
 * `demands`), então os arrays chegam vazios e os botões ficam escondidos.
 * O indicador de filtro ativo é um badge com contagem, na cor primary.
 */

/**
 * OS ÍCONES DAS LENTES PRECISAM SE DISTINGUIR ENTRE SI, NÃO SÓ FAZER SENTIDO
 *
 * Cada lente tem uma silhueta própria — colunas, intervalo no calendário,
 * curva de atividade, barras horizontais:
 *   Board    colunas verticais       o que a lente literalmente desenha
 *   Sprint   intervalo no calendário janela de entrega é um período, não um cronômetro
 *   Timeline pulso de atividade      "o que se mexeu por último"
 *   Gantt    barras no tempo         a única que já estava certa
 */
export const LENTES: { id: LenteId; rotulo: string; icone: typeof Columns3; ajuda: string }[] = [
  { id: "board", rotulo: "Board", icone: Columns3, ajuda: "Board — colunas, com arrastar e soltar" },
  { id: "sprint", rotulo: "Sprint", icone: CalendarRange, ajuda: "Sprint — agrupada por janela de entrega" },
  { id: "timeline", rotulo: "Timeline", icone: Activity, ajuda: "Timeline — agrupada por última movimentação" },
  { id: "gantt", rotulo: "Gantt", icone: GanttChart, ajuda: "Gantt — distribuição no calendário" },
];

export function isLenteId(v: string | null): v is LenteId {
  return !!v && LENTES.some((l) => l.id === v);
}

export function isFilaId(v: string | null): v is FilaId {
  return !!v && FILAS.some((f) => f.id === v);
}

// ─── Tipos de filtro ──────────────────────────────────────────────────────────

export interface MembroFiltro {
  id: string;
  nome: string;
  avatarUrl?: string | null;
}

export interface EtiquetaFiltro {
  id: string;
  nome: string | null;
  cor: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

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
  /** Membros disponíveis para filtro — apenas em escopo de projeto. */
  membrosDisponiveis?: MembroFiltro[];
  filtroMembros?: string[];
  onFiltroMembro?: (ids: string[]) => void;
  /** Etiquetas disponíveis para filtro — apenas em escopo de projeto. */
  etiquetasDisponiveis?: EtiquetaFiltro[];
  filtrosEtiquetas?: string[];
  onFiltroEtiqueta?: (ids: string[]) => void;
  /** Ações extra (ex.: papel de parede) no mesmo grupo dos ícones de lente. */
  acoes?: ReactNode;
}

// ─── Sub-componentes dos filtros ──────────────────────────────────────────────

function FiltroMembros({
  membros,
  ativos,
  onChange,
}: {
  membros: MembroFiltro[];
  ativos: string[];
  onChange: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const temFiltro = ativos.length > 0;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filtrar por membro"
          aria-expanded={aberto}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] leading-4",
            "transition-colors duration-fast ease-standard",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            temFiltro
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <Users className="size-3.5 shrink-0" aria-hidden />
          Membros
          {temFiltro && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">
              {ativos.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-2">
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrar por membro
        </p>
        <ul className="max-h-60 space-y-0.5 overflow-y-auto">
          {membros.map((m) => {
            const ativo = ativos.includes(m.id);
            return (
              <li key={m.id}>
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                  htmlFor={`filtro-membro-${m.id}`}
                >
                  <Checkbox
                    id={`filtro-membro-${m.id}`}
                    checked={ativo}
                    onCheckedChange={(v) =>
                      onChange(v ? [...ativos, m.id] : ativos.filter((id) => id !== m.id))
                    }
                  />
                  <Avatar className="size-5 shrink-0">
                    {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt={m.nome} />}
                    <AvatarFallback className="text-[9px]">
                      {m.nome.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm leading-tight">{m.nome}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {temFiltro && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-2 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpar filtro de membros
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function FiltroEtiquetas({
  etiquetas,
  ativas,
  onChange,
}: {
  etiquetas: EtiquetaFiltro[];
  ativas: string[];
  onChange: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const temFiltro = ativas.length > 0;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filtrar por etiqueta"
          aria-expanded={aberto}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[13px] leading-4",
            "transition-colors duration-fast ease-standard",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            temFiltro
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          <Tag className="size-3.5 shrink-0" aria-hidden />
          Etiquetas
          {temFiltro && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">
              {ativas.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 p-2">
        <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Filtrar por etiqueta
        </p>
        <ul className="max-h-60 space-y-0.5 overflow-y-auto">
          {etiquetas.map((e) => {
            const ativa = ativas.includes(e.id);
            return (
              <li key={e.id}>
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                  htmlFor={`filtro-etiqueta-${e.id}`}
                >
                  <Checkbox
                    id={`filtro-etiqueta-${e.id}`}
                    checked={ativa}
                    onCheckedChange={(v) =>
                      onChange(v ? [...ativas, e.id] : ativas.filter((id) => id !== e.id))
                    }
                  />
                  <span
                    className="size-3 shrink-0 rounded-sm"
                    style={labelColorStyle(e.cor)}
                    aria-hidden
                  />
                  <span className="truncate text-sm leading-tight">{e.nome ?? "Sem nome"}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {temFiltro && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-2 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Limpar filtro de etiquetas
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Barra principal ──────────────────────────────────────────────────────────

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
  membrosDisponiveis = [],
  filtroMembros = [],
  onFiltroMembro,
  etiquetasDisponiveis = [],
  filtrosEtiquetas = [],
  onFiltroEtiqueta,
  acoes,
}: Props) {
  const temFiltrosAvancados = membrosDisponiveis.length > 0 || etiquetasDisponiveis.length > 0;
  const temQualquerFiltro = busca || filtroMembros.length > 0 || filtrosEtiquetas.length > 0;

  return (
    <div className="surface-glass sticky top-0 z-20 border-b">
      <div className="flex h-10 w-full items-center gap-1 px-4 md:px-6">
        {/* Filas */}
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

        {/* Lentes */}
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

        {acoes && (
          <>
            <span className="mx-1.5 h-4 w-px shrink-0 bg-border" aria-hidden />
            <div className="flex shrink-0 items-center gap-0.5">{acoes}</div>
          </>
        )}

        {/* Filtros avançados: Membros e Etiquetas — só em escopo de projeto */}
        {temFiltrosAvancados && (
          <>
            <span className="mx-1.5 h-4 w-px shrink-0 bg-border" aria-hidden />
            {membrosDisponiveis.length > 0 && onFiltroMembro && (
              <FiltroMembros
                membros={membrosDisponiveis}
                ativos={filtroMembros}
                onChange={onFiltroMembro}
              />
            )}
            {etiquetasDisponiveis.length > 0 && onFiltroEtiqueta && (
              <FiltroEtiquetas
                etiquetas={etiquetasDisponiveis}
                ativas={filtrosEtiquetas}
                onChange={onFiltroEtiqueta}
              />
            )}
          </>
        )}

        {/* Campo de busca */}
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
              aria-label="Limpar filtro de texto"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Contador — só quando há filtro ativo */}
        {temQualquerFiltro && (
          <span className="ds-caption shrink-0 tabular-nums text-muted-foreground">
            {filtradas} de {total}
          </span>
        )}
      </div>
    </div>
  );
}

export const BarraDeTrabalho = memo(BarraDeTrabalhoImpl);