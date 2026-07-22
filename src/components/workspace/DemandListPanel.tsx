import { memo, useMemo, useState } from "react";
import { AlertTriangle, Flame, Inbox as InboxIcon, Search, Star, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDemands } from "@/modules/demands/hooks";
import {
  PRIORITY_META,
  STATUS_COLUMNS,
  type Demand,
  type DemandStatus,
} from "@/modules/demands/types";
import { useAuth } from "@/hooks/useAuth";
import { useFavoriteDemands } from "@/components/portal/useFavoriteDemands";

type FilterKey = "todos" | "minhas" | "atraso" | "criticas" | "favoritas";

const FILTERS: { id: FilterKey; label: string; icon: typeof Star }[] = [
  { id: "todos", label: "Todos", icon: InboxIcon },
  { id: "minhas", label: "Minhas", icon: UserIcon },
  { id: "criticas", label: "Críticas", icon: Flame },
  { id: "atraso", label: "Em atraso", icon: AlertTriangle },
  { id: "favoritas", label: "Favoritos", icon: Star },
];

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const STATUS_LABEL: Record<DemandStatus, string> = STATUS_COLUMNS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s.label }),
  {} as Record<DemandStatus, string>,
);

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export const DemandListPanel = memo(function DemandListPanel({ selectedId, onSelect }: Props) {
  const { user } = useAuth();
  const { data: demands = [], isLoading } = useDemands();
  const { favorites, isFavorite, toggle } = useFavoriteDemands();

  const [filter, setFilter] = useState<FilterKey>("todos");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const mine = demands.filter((d) => d.assigned_to === user?.id).length;
    const criticas = demands.filter((d) => d.priority === "critica").length;
    const atraso = demands.filter((d) => d.sla_status === "estourado" || d.sla_status === "atencao").length;
    return { minhas: mine, criticas, atraso, favoritas: favorites.length, todos: demands.length };
  }, [demands, user?.id, favorites.length]);

  const filtered = useMemo<Demand[]>(() => {
    let base = demands;
    if (filter === "minhas") base = base.filter((d) => d.assigned_to === user?.id);
    else if (filter === "criticas") base = base.filter((d) => d.priority === "critica");
    else if (filter === "atraso")
      base = base.filter((d) => d.sla_status === "estourado" || d.sla_status === "atencao");
    else if (filter === "favoritas") base = base.filter((d) => favorites.includes(d.id));

    const term = q.trim().toLowerCase();
    if (term)
      base = base.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          (d.description ?? "").toLowerCase().includes(term),
      );
    return [...base]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 80);
  }, [demands, filter, q, user?.id, favorites]);

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-border bg-card/40">
      <div className="border-b border-border/60 p-3 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5">
          <Search className="size-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar demandas…"
            className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3" />
                {f.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-medium tabular-nums",
                      active ? "bg-primary-foreground/20" : "bg-muted",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            Nada por aqui. Ajuste os filtros ou a busca.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((d) => {
              const active = d.id === selectedId;
              const pri = PRIORITY_META[d.priority];
              const fav = isFavorite(d.id);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(d.id)}
                    className={cn(
                      "group flex w-full items-start gap-2 px-3 py-2.5 text-left transition",
                      active
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "border-l-2 border-transparent hover:bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(d.id);
                      }}
                      aria-pressed={fav}
                      aria-label={fav ? "Desfavoritar" : "Favoritar"}
                      className={cn(
                        "mt-0.5 shrink-0 rounded p-0.5 transition",
                        fav
                          ? "text-amber-500"
                          : "text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-amber-500",
                      )}
                    >
                      <Star className={cn("size-3.5", fav && "fill-current")} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px]", pri.className)}>
                          {pri.label}
                        </Badge>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {STATUS_LABEL[d.status]}
                        </span>
                        {d.sla_status === "estourado" && (
                          <span className="text-[10px] font-medium text-destructive">SLA</span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{d.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {relativeTime(d.updated_at)} atrás
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
});
