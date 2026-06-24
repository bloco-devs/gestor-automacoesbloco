import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Filter, Inbox, KanbanSquare, Search, TrendingUp, User } from "lucide-react";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listSolicitacoes } from "@/lib/supabaseData";
import { STATUS_LABEL, type PipelineStatus, FREQUENCIA_LABEL, freqLabel, type Frequencia } from "@/lib/types";
import { useSetoresNomes } from "@/hooks/useSetores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ScorePill } from "@/components/ScorePill";
import { FieldHelp } from "@/components/FieldHelp";
import { DataSourceBadge } from "@/components/DataSourceBadge";
import { EmptyState } from "@/components/EmptyState";
import { ListState } from "@/components/ListState";

const DASHBOARD_STATUSES: PipelineStatus[] = [
  "novo",
  "em_analise",
  "em_desenvolvimento",
  "pronto",
];

export default function Dashboard() {
  const { data, loading, error, refetch } = useSupabaseQuery(() => listSolicitacoes(), []);
  const all = data ?? [];
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");

  const setoresCadastrados = useSetoresNomes();
  const setoresDisponiveis = useMemo(() => {
    const set = new Set<string>(setoresCadastrados);
    for (const s of all) if (s.setor) set.add(String(s.setor));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [all, setoresCadastrados]);

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
        {([
          { status: "novo" as PipelineStatus, icon: Inbox },
          { status: "em_analise" as PipelineStatus, icon: Search },
          { status: "em_desenvolvimento" as PipelineStatus, icon: TrendingUp },
          { status: "pronto" as PipelineStatus, icon: CheckCircle2 },
        ]).map(({ status, icon }) => (
          <MetricCard
            key={status}
            icon={icon}
            label={STATUS_LABEL[status]}
            value={metrics[status as keyof typeof metrics]}
            active={statusFilter === status}
            onClick={() => setStatusFilter((prev) => (prev === status ? "all" : status))}
          />
        ))}
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
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            Solicitações ({filtered.length})
            <FieldHelp>
              Score de priorização de 0 a 100, calculado a partir de frequência, dificuldade e
              retorno. O score final é ajustado pela complexidade técnica.
            </FieldHelp>
          </h2>
        </div>

        <ListState
          loading={loading}
          error={error}
          isEmpty={filtered.length === 0}
          onRetry={refetch}
          skeleton={
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="surface-1">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-10" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
          empty={
            all.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nenhuma solicitação por aqui ainda"
                description="As demandas aparecem aqui assim que os solicitantes as cadastram."
              />
            ) : (
              <EmptyState
                icon={Inbox}
                title="Nada com esses filtros"
                description="Tente limpar ou alterar os filtros acima."
              />
            )
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <SolicitacaoCard key={s.id} s={s} />
            ))}
          </div>
        </ListState>
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
      onClick={() => navigate(`/solicitacao/${s.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/solicitacao/${s.id}`);
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
            {freqLabel(s.frequencia)}
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
      <CardContent className="p-2.5 flex items-center gap-2">
        <div
          className={`size-7 rounded-md flex items-center justify-center shrink-0 ${
            active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
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
