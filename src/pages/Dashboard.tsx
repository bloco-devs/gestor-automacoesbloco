import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, KanbanSquare, ListChecks, Rocket, TrendingUp } from "lucide-react";
import { useStoreSubscription } from "@/hooks/useStore";
import { listSolicitacoes } from "@/lib/store";
import { STATUS_LABEL, type PipelineStatus, FREQUENCIA_LABEL } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ScorePill } from "@/components/ScorePill";

export default function Dashboard() {
  const all = useStoreSubscription(() => listSolicitacoes());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [solicitanteFilter, setSolicitanteFilter] = useState("");
  const [minScore, setMinScore] = useState(0);

  const solicitantes = useMemo(
    () => Array.from(new Set(all.map((s) => s.solicitanteNome))).sort(),
    [all],
  );

  const filtered = useMemo(() => {
    return all
      .filter((s) => statusFilter === "all" || s.status === statusFilter)
      .filter((s) => !solicitanteFilter || s.solicitanteNome === solicitanteFilter)
      .filter((s) => s.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }, [all, statusFilter, solicitanteFilter, minScore]);

  const metrics = useMemo(() => {
    return {
      total: all.length,
      dev: all.filter((s) => s.status === "em_desenvolvimento").length,
      pronto: all.filter((s) => s.status === "pronto").length,
      prod: all.filter((s) => s.status === "em_producao").length,
    };
  }, [all]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard de priorização</h1>
          <p className="text-sm text-muted-foreground">Demandas ordenadas por score automático.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/kanban">
            <KanbanSquare className="size-4" /> Abrir Kanban
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={ListChecks} label="Total" value={metrics.total} />
        <MetricCard icon={TrendingUp} label="Em desenvolvimento" value={metrics.dev} />
        <MetricCard icon={Rocket} label="Prontas" value={metrics.pronto} accent />
        <MetricCard icon={Rocket} label="Em produção" value={metrics.prod} accent />
      </div>

      <Card className="surface-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="size-4" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as PipelineStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={solicitanteFilter || "all"} onValueChange={(v) => setSolicitanteFilter(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Solicitante" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os solicitantes</SelectItem>
              {solicitantes.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              placeholder="Score mínimo"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="surface-1">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Score</TableHead>
                <TableHead>Demanda</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma demanda encontrada com esses filtros.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell><ScorePill score={s.score} /></TableCell>
                  <TableCell>
                    <div className="font-medium">{s.titulo}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{s.descricao}</div>
                  </TableCell>
                  <TableCell className="text-sm">{s.solicitanteNome}</TableCell>
                  <TableCell className="text-sm">{FREQUENCIA_LABEL[s.frequencia]}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/demanda/${s.id}`}>Detalhes</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: boolean }) {
  return (
    <Card className="surface-1">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`size-10 rounded-md flex items-center justify-center ${accent ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
