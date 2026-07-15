import { CalendarIcon, Filter, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  labelColorClass,
  labelColorStyle,
  type AtividadeLabel,
  type PrazoStatus,
} from "@/lib/atividades";
import { PRAZO_FILTERS } from "./helpers";

export interface BoardFiltersProps {
  busca: string;
  setBusca: (v: string) => void;
  responsaveis: { id: string; nome: string }[];
  solucoes: { id: string; titulo: string }[];
  labels: AtividadeLabel[];
  filterUserIds: string[];
  setFilterUserIds: (v: string[]) => void;
  filterSolucaoIds: string[];
  setFilterSolucaoIds: (v: string[]) => void;
  filterLabelIds: string[];
  setFilterLabelIds: (v: string[]) => void;
  filterPrazo: PrazoStatus | "todos";
  setFilterPrazo: (v: PrazoStatus | "todos") => void;
  onClearAll: () => void;
  hasFilters: boolean;
  totalCards: number;
  totalCardsFiltrados: number;
}

export function BoardFilters(props: BoardFiltersProps) {
  const {
    busca,
    setBusca,
    responsaveis,
    solucoes,
    labels,
    filterUserIds,
    setFilterUserIds,
    filterSolucaoIds,
    setFilterSolucaoIds,
    filterLabelIds,
    setFilterLabelIds,
    filterPrazo,
    setFilterPrazo,
    onClearAll,
    hasFilters,
    totalCards,
    totalCardsFiltrados,
  } = props;

  return (
    <div className="flex items-center gap-2 flex-wrap sticky top-0 z-10 bg-background/90 backdrop-blur py-2 -mx-2 px-2 rounded-md">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título ou descrição..."
          className="pl-8 h-9"
          aria-label="Buscar cards"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Limpar busca"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <FilterPopover
        label="Responsável"
        items={responsaveis.map((u) => ({ id: u.id, label: u.nome }))}
        selected={filterUserIds}
        onChange={setFilterUserIds}
      />
      <FilterPopover
        label="Solução"
        items={solucoes.map((s) => ({ id: s.id, label: s.titulo }))}
        selected={filterSolucaoIds}
        onChange={setFilterSolucaoIds}
      />
      <LabelsFilterPopover
        labels={labels}
        selected={filterLabelIds}
        onChange={setFilterLabelIds}
      />
      <PrazoFilterPopover value={filterPrazo} onChange={setFilterPrazo} />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <X className="size-3.5" /> Limpar
        </Button>
      )}
      {hasFilters && (
        <span className="text-xs text-muted-foreground tabular-nums ml-auto">
          {totalCardsFiltrados} de {totalCards} cards
        </span>
      )}
    </div>
  );
}

function FilterPopover({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected.length > 0 ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          aria-label={`Filtrar por ${label.toLowerCase()}`}
        >
          <Filter className="size-3.5" />
          {label}
          {selected.length > 0 && (
            <span className="ml-1 rounded-full bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 tabular-nums">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs font-medium text-muted-foreground">
            Filtrar por {label.toLowerCase()}
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto mt-1">
          {items.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum item</div>
          ) : (
            items.map((it) => (
              <label
                key={it.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent/10 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(it.id)}
                  onCheckedChange={() => toggle(it.id)}
                />
                <span className="text-sm truncate">{it.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function LabelsFilterPopover({
  labels,
  selected,
  onChange,
}: {
  labels: AtividadeLabel[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected.length > 0 ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          aria-label="Filtrar por etiquetas"
        >
          <Tag className="size-3.5" />
          Etiquetas
          {selected.length > 0 && (
            <span className="ml-1 rounded-full bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 tabular-nums">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="max-h-64 overflow-y-auto space-y-1">
          {labels.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">Crie etiquetas no card</div>
          ) : (
            labels.map((l) => (
              <label
                key={l.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent/10 cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(l.id)}
                  onCheckedChange={() => toggle(l.id)}
                />
                <span
                  className={cn(
                    "flex-1 truncate px-2 py-0.5 rounded text-xs font-medium border",
                    labelColorClass(l.cor),
                  )}
                  style={labelColorStyle(l.cor)}
                >
                  {l.nome}
                </span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PrazoFilterPopover({
  value,
  onChange,
}: {
  value: PrazoStatus | "todos";
  onChange: (v: PrazoStatus | "todos") => void;
}) {
  const active = value !== "todos";
  const current = PRAZO_FILTERS.find((f) => f.key === value)?.label ?? "Prazo";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={active ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          aria-label="Filtrar por prazo"
        >
          <CalendarIcon className="size-3.5" />
          {active ? current : "Prazo"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {PRAZO_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent/10",
              value === f.key && "bg-accent/10 font-medium",
            )}
          >
            {f.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
