import { useMemo, useState } from "react";
import { format, addDays, differenceInDays, startOfWeek, startOfMonth, addMonths, max as dateMax, min as dateMin, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type GanttItem = {
  id: string;
  title: string;
  /** Cor de fundo da barra (classe tailwind, ex: "bg-info"). */
  colorClass?: string;
  /** Subtítulo / status mostrado em cinza. */
  subtitle?: string;
  start: string | null; // ISO date YYYY-MM-DD
  end: string | null;
};

type Zoom = "week" | "month" | "quarter";

const ZOOM_PX_PER_DAY: Record<Zoom, number> = {
  week: 28,
  month: 10,
  quarter: 4,
};

export type GanttChartProps = {
  items: GanttItem[];
  onItemClick?: (id: string) => void;
  onSaveDates?: (id: string, start: string | null, end: string | null) => Promise<void> | void;
  emptyLabel?: string;
};

export function GanttChart({ items, onItemClick, onSaveDates, emptyLabel = "Nenhum item." }: GanttChartProps) {
  const [zoom, setZoom] = useState<Zoom>("month");

  const { scheduled, unscheduled } = useMemo(() => {
    const s: GanttItem[] = [];
    const u: GanttItem[] = [];
    for (const it of items) {
      if (it.start && it.end) s.push(it);
      else u.push(it);
    }
    return { scheduled: s, unscheduled: u };
  }, [items]);

  const range = useMemo(() => {
    if (scheduled.length === 0) {
      const today = new Date();
      return { start: addDays(today, -7), end: addDays(today, 30) };
    }
    const starts = scheduled.map((i) => parseISO(i.start as string));
    const ends = scheduled.map((i) => parseISO(i.end as string));
    return {
      start: addDays(dateMin(starts), -3),
      end: addDays(dateMax(ends), 7),
    };
  }, [scheduled]);

  const totalDays = Math.max(7, differenceInDays(range.end, range.start) + 1);
  const pxPerDay = ZOOM_PX_PER_DAY[zoom];
  const totalWidth = totalDays * pxPerDay;

  const headerCells = useMemo(() => {
    const cells: { label: string; offsetDays: number; widthDays: number }[] = [];
    if (zoom === "week") {
      let cursor = startOfWeek(range.start, { weekStartsOn: 1 });
      while (cursor <= range.end) {
        const next = addDays(cursor, 7);
        const offset = Math.max(0, differenceInDays(cursor, range.start));
        const width = Math.min(7, differenceInDays(next, range.start) - offset);
        cells.push({ label: format(cursor, "dd/MM", { locale: ptBR }), offsetDays: offset, widthDays: width });
        cursor = next;
      }
    } else {
      let cursor = startOfMonth(range.start);
      while (cursor <= range.end) {
        const next = addMonths(cursor, 1);
        const offset = Math.max(0, differenceInDays(cursor, range.start));
        const width = Math.min(differenceInDays(next, cursor), differenceInDays(range.end, cursor) + 1);
        cells.push({ label: format(cursor, "MMM yyyy", { locale: ptBR }), offsetDays: offset, widthDays: width });
        cursor = next;
      }
    }
    return cells;
  }, [zoom, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {scheduled.length} agendado{scheduled.length === 1 ? "" : "s"} ·{" "}
          {unscheduled.length} sem cronograma
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          {(["week", "month", "quarter"] as Zoom[]).map((z) => (
            <Button
              key={z}
              size="sm"
              variant={zoom === z ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setZoom(z)}
            >
              {z === "week" ? "Semana" : z === "month" ? "Mês" : "Trimestre"}
            </Button>
          ))}
        </div>
      </div>

      {unscheduled.length > 0 && (
        <Card className="surface-1 border-dashed">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <AlertCircle className="size-3.5" />
              Sem cronograma
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduled.map((it) => (
                <UnscheduledRow key={it.id} item={it} onItemClick={onItemClick} onSaveDates={onSaveDates} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="surface-1">
        <CardContent className="p-0 overflow-x-auto">
          {scheduled.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">{emptyLabel}</div>
          ) : (
            <div className="min-w-full" style={{ width: Math.max(totalWidth + 280, 600) }}>
              {/* Header */}
              <div className="flex border-b border-border sticky top-0 bg-card z-10">
                <div className="w-[280px] shrink-0 border-r border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Item
                </div>
                <div className="relative flex-1" style={{ height: 32 }}>
                  {headerCells.map((c, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-border/60 px-1.5 text-[11px] text-muted-foreground flex items-center"
                      style={{ left: c.offsetDays * pxPerDay, width: c.widthDays * pxPerDay }}
                    >
                      {c.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              {scheduled.map((it) => {
                const startD = parseISO(it.start as string);
                const endD = parseISO(it.end as string);
                const left = Math.max(0, differenceInDays(startD, range.start)) * pxPerDay;
                const width = Math.max(pxPerDay, (differenceInDays(endD, startD) + 1) * pxPerDay);
                return (
                  <div key={it.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/30">
                    <div
                      className="w-[280px] shrink-0 border-r border-border px-3 py-2.5 cursor-pointer"
                      onClick={() => onItemClick?.(it.id)}
                    >
                      <div className="text-sm font-medium truncate">{it.title}</div>
                      {it.subtitle && (
                        <div className="text-[11px] text-muted-foreground truncate">{it.subtitle}</div>
                      )}
                    </div>
                    <div className="relative flex-1" style={{ height: 44 }}>
                      <BarPopover item={it} onSaveDates={onSaveDates} onItemClick={onItemClick}>
                        <button
                          type="button"
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-6 rounded-md border border-border/50 px-2 text-[11px] font-medium text-left truncate transition-shadow hover:shadow-md",
                            it.colorClass ?? "bg-primary/80 text-primary-foreground",
                          )}
                          style={{ left, width }}
                          title={`${format(startD, "dd/MM/yyyy")} → ${format(endD, "dd/MM/yyyy")}`}
                        >
                          {format(startD, "dd/MM")} → {format(endD, "dd/MM")}
                        </button>
                      </BarPopover>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UnscheduledRow({
  item,
  onItemClick,
  onSaveDates,
}: {
  item: GanttItem;
  onItemClick?: (id: string) => void;
  onSaveDates?: (id: string, start: string | null, end: string | null) => Promise<void> | void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
      <button
        type="button"
        className="text-xs font-medium text-left truncate flex-1 hover:text-accent"
        onClick={() => onItemClick?.(item.id)}
      >
        {item.title}
      </button>
      <BarPopover item={item} onSaveDates={onSaveDates} onItemClick={onItemClick}>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]">
          <CalendarIcon className="size-3 mr-1" />
          Definir datas
        </Button>
      </BarPopover>
    </div>
  );
}

function BarPopover({
  item,
  onSaveDates,
  onItemClick,
  children,
}: {
  item: GanttItem;
  onSaveDates?: (id: string, start: string | null, end: string | null) => Promise<void> | void;
  onItemClick?: (id: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Date | undefined>(item.start ? parseISO(item.start) : undefined);
  const [end, setEnd] = useState<Date | undefined>(item.end ? parseISO(item.end) : undefined);
  const [saving, setSaving] = useState(false);

  if (!onSaveDates) {
    return (
      <span onClick={() => onItemClick?.(item.id)} className="contents">
        {children}
      </span>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveDates(
        item.id,
        start ? format(start, "yyyy-MM-dd") : null,
        end ? format(end, "yyyy-MM-dd") : null,
      );
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start">
        <div className="text-xs font-medium">{item.title}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">Início</div>
            <Calendar
              mode="single"
              selected={start}
              onSelect={setStart}
              className={cn("p-2 pointer-events-auto rounded border")}
            />
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-muted-foreground">Fim</div>
            <Calendar
              mode="single"
              selected={end}
              onSelect={setEnd}
              className={cn("p-2 pointer-events-auto rounded border")}
            />
          </div>
        </div>
        <div className="flex justify-between gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStart(undefined);
              setEnd(undefined);
            }}
          >
            Limpar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
