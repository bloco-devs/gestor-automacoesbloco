import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Filter, Inbox, KanbanSquare, Search, TrendingUp, User } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { listSolicitacoes } from "@/lib/supabaseData";
import { STATUS_LABEL, type PipelineStatus, FREQUENCIA_LABEL, type Frequencia, SETORES } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ScorePill } from "@/components/ScorePill";

const DASHBOARD_STATUSES: PipelineStatus[] = [
  "novo",
  "em_analise",
  "em_desenvolvimento",
  "pronto",
];

export default function Dashboard() {
  const all = useSupabaseData(() => listSolicitacoes(), []);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");

  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>(SETORES as readonly string[]);
    for (const s of all) if (s.setor) set.add(String(s.setor));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [all]);

  const filtered = useMemo(() => {
    return all
      .filter((s) => {
        if (statusFilter === "all") return DASHBOARD_STATUSES.includes(s.status);
        return s.status === statusFilter;
      })
      .filter((s) => tipoFilter === "all" || String(s.frequencia) === tipoFilter)
      .filter((s) => setorFilter === "all" || String(s.setor ?? "") === setorFilter)
      .sort((a, b) => b.score - a.score);
  }, [all, statusFilter, tipoFilter, setorFilter]);

  const metrics = useMemo(
    () => ({
      novo: all.filter((s) => s.status === "novo").length,
      em_analise: all.filter((s) => s.status === "em_analise").length,
      em_desenvolvimento: all.filter((s) => s.status === "em_desenvolvimento").length,
      pronto: all.filter((s) => s.status === "pronto").length,
    }),
    [all],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Solicitações ordenadas por prioridade.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/kanban">
            <KanbanSquare className="size-4" /> Abrir Kanban
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={Inbox} label={STATUS_LABEL.novo} value={metrics.novo} accent />
        <MetricCard icon={Search} label={STATUS_LABEL.em_analise} value={metrics.em_analise} />
        <MetricCard icon={TrendingUp} label={STATUS_LABEL.em_desenvolvimento} value={metrics.em_desenvolvimento} />
        <MetricCard icon={CheckCircle2} label={STATUS_LABEL.pronto} value={metrics.pronto} />
      </div>

      <Card className="surface-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {DASHBOARD_STATUSES.map((s) => (
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
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Tipo (frequência)</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {([4, 3, 2, 1] as Frequencia[]).map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    {FREQUENCIA_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Solicitações ({filtered.length})
          </h2>
        </div>

        {filtered.length === 0 ? (
          <Card className="surface-1">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Inbox className="size-8 mx-auto mb-3 opacity-60" />
              <p className="text-sm">Nenhuma solicitação encontrada com esses filtros.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <SolicitacaoCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SolicitacaoCard({ s }: { s: import("@/lib/types").Solicitacao }) {
  const navigate = useNavigate();
  const data = new Date(s.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/demanda/${s.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/demanda/${s.id}`);
        }
      }}
      className="surface-1 hover:border-accent/50 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge status={s.status} />
          <ScorePill score={s.score} />
        </div>

        <div>
          <h3 className="font-medium leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {s.titulo}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {s.descricao}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border">
          <span className="flex items-center gap-1.5">
            <User className="size-3.5" />
            <span className="text-foreground/80">{s.solicitanteNome}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            {data}
          </span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 font-normal">
            {FREQUENCIA_LABEL[s.frequencia]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card className="surface-1">
      <CardContent className="p-2.5 flex items-center gap-2">
        <div
          className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
            accent ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold tabular-nums leading-tight">{value}</div>
          <div className="text-[11px] text-muted-foreground leading-tight truncate">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
