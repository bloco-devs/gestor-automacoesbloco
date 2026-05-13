import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Filter, Inbox, Search, TrendingUp, User } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolicitacoes } from "@/lib/supabaseData";
import { STATUS_LABEL, statusToCategory, PIPELINE_ORDER, type PipelineStatus, SETORES } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";

const STATUS_ICONS: Record<PipelineStatus, React.ComponentType<{ className?: string }>> = {
  novo: Inbox,
  em_analise: Search,
  aprovado: TrendingUp,
  em_desenvolvimento: TrendingUp,
  testando: TrendingUp,
  pronto: CheckCircle2,
  em_producao: CheckCircle2,
};

export default function RequesterDashboard() {
  const navigate = useNavigate();
  const all = useSupabaseData(() => listSolicitacoes(), []);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");

  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>(SETORES as readonly string[]);
    for (const s of all) if (s.setor) set.add(String(s.setor));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [all]);

  const filtered = useMemo(() => {
    return all
      .filter((s) => {
        if (statusFilter === "all") return true;
        return statusToCategory(s.status) === statusFilter;
      })
      .filter((s) => setorFilter === "all" || String(s.setor ?? "") === setorFilter)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [all, statusFilter, setorFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { novo: 0, em_analise: 0, em_desenvolvimento: 0, pronto: 0 };
    for (const s of all) {
      const cat = statusToCategory(s.status);
      if (cat in c) c[cat] += 1;
    }
    return c;
  }, [all]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe o status de todos os sistemas e automações em desenvolvimento.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {PIPELINE_ORDER.map((s) => (
          <MetricCard
            key={s}
            icon={STATUS_ICONS[s]}
            label={STATUS_LABEL[s]}
            value={counts[s] ?? 0}
            active={statusFilter === s}
            onClick={() => setStatusFilter((prev) => (prev === s ? "all" : s))}
          />
        ))}
      </div>

      <Card className="surface-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {PIPELINE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Departamento</label>
            <Select value={setorFilter} onValueChange={setSetorFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {setoresDisponiveis.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="surface-1">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Inbox className="size-8 mx-auto mb-3 opacity-60" />
            <p className="text-sm">Nenhuma solicitação encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => {
            const data = new Date(s.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric",
            });
            return (
              <Card
                key={s.id}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/demanda/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/demanda/${s.id}`);
                  }
                }}
                className="surface-1 cursor-pointer hover:border-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-snug line-clamp-2">{s.titulo}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.descricao}</p>
                  <StatusTimeline current={s.status} compact />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3.5" />
                      <span className="text-foreground/80">{s.solicitanteNome}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {data}
                    </span>
                    {s.setor && (
                      <span className="text-foreground/80">{s.setor}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`surface-1 transition-colors ${
        onClick ? "cursor-pointer hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""
      } ${active ? "border-accent ring-1 ring-accent" : ""}`}
    >
      <CardContent className="p-3 flex items-center gap-2">
        <div
          className={`size-8 rounded-md flex items-center justify-center shrink-0 ${
            active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xl font-semibold tabular-nums leading-tight">{value}</div>
          <div className="text-xs text-muted-foreground leading-tight truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
