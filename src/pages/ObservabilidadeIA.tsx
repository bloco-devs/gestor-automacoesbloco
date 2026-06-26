import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  aggregateIaUsage,
  fetchIaUsage,
  periodToSinceIso,
  type IaUsageAggregates,
  type IaUsageRow,
} from "@/lib/iaUsage";
import { useAuth } from "@/hooks/useAuth";

type Period = "24h" | "7d" | "30d";

function fmtNumber(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

function statusVariant(status: string | null) {
  const s = (status || "").toLowerCase();
  if (s === "ok" || s === "sucesso" || s === "success") return "secondary" as const;
  if (s === "limite" || s === "limit" || s === "rate_limit") return "outline" as const;
  return "destructive" as const;
}

function BreakdownTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: IaUsageAggregates["byAcao"];
  total: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados no período.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Chamadas</TableHead>
                <TableHead className="text-right">Tokens in</TableHead>
                <TableHead className="text-right">Tokens out</TableHead>
                <TableHead className="w-[140px]">Participação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const pct = total ? (r.count / total) * 100 : 0;
                return (
                  <TableRow key={r.key}>
                    <TableCell className="font-medium">{r.key}</TableCell>
                    <TableCell className="text-right">{fmtNumber(r.count)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(r.tokensIn)}</TableCell>
                    <TableCell className="text-right">{fmtNumber(r.tokensOut)}</TableCell>
                    <TableCell>
                      <Progress value={pct} aria-label={`${pct.toFixed(1)}%`} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default function ObservabilidadeIA() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdministrador;
  const [period, setPeriod] = useState<Period>("7d");
  const [rows, setRows] = useState<IaUsageRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(
    async (p: Period) => {
      setLoading(true);
      try {
        const data = await fetchIaUsage({
          sinceIso: periodToSinceIso(p),
          limit: 1000,
        });
        setRows(data);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("Falha ao carregar uso de IA", { description: msg });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(period);
  }, [period, load]);

  const agg = useMemo(() => aggregateIaUsage(rows), [rows]);
  const recent = rows.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="size-6" /> Observabilidade de IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Uso registrado em <code>ia_uso_log</code> no período selecionado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="ia-periodo">Período</label>
          <ToggleGroup
            id="ia-periodo"
            type="single"
            value={period}
            onValueChange={(v) => v && setPeriod(v as Period)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="24h">24h</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 dias</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 dias</ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load(period)}
            disabled={loading}
          >
            <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <span>
            Você está vendo apenas o seu próprio uso. A visão consolidada de todos os
            usuários requer papel de administrador (aplicado via RLS).
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Chamadas</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-semibold">{fmtNumber(agg.totalCalls)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              % erro / limite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-semibold">
                {fmtPct(agg.errorRate)}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({agg.errorCount} erro · {agg.limitCount} limite)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tokens in</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-semibold">{fmtNumber(agg.totalTokensIn)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tokens out</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-semibold">{fmtNumber(agg.totalTokensOut)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <BreakdownTable title="Por ação" rows={agg.byAcao} total={agg.totalCalls} />
        <BreakdownTable title="Por modelo" rows={agg.byModelo} total={agg.totalCalls} />
        <BreakdownTable title="Por status" rows={agg.byStatus} total={agg.totalCalls} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tokens in</TableHead>
                  <TableHead className="text-right">Tokens out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r, i) => (
                  <TableRow key={`${r.created_at}-${i}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDateTime(r.created_at)}
                    </TableCell>
                    <TableCell className="font-medium">{r.acao ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.modelo ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtNumber(Number(r.tokens_in ?? 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtNumber(Number(r.tokens_out ?? 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
