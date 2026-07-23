import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function QueryInspector() {
  const client = useQueryClient();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const unsub = client.getQueryCache().subscribe(() => forceTick((n) => (n + 1) % 1_000_000));
    return () => { unsub(); };
  }, [client]);

  const rows = client.getQueryCache().getAll().map((q) => ({
    key: JSON.stringify(q.queryKey),
    status: q.state.status,
    fetchStatus: q.state.fetchStatus,
    observers: q.getObserversCount(),
    dataUpdatedAt: q.state.dataUpdatedAt,
    stale: q.isStale(),
  }));

  const total = rows.length;
  const active = rows.filter((r) => r.observers > 0).length;
  const stale = rows.filter((r) => r.stale).length;
  const errors = rows.filter((r) => r.status === "error").length;

  return (
    <DeveloperShell
      title="Query Inspector"
      description="Cache do React Query em tempo real via QueryClient existente."
    >
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Queries" value={total} />
        <StatCard label="Ativas (observers)" value={active} tone="info" />
        <StatCard label="Stale" value={stale} tone="warning" />
        <StatCard label="Erros" value={errors} tone={errors ? "danger" : "neutral"} />
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2">Query Key</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Fetch</th>
                <th className="text-left p-2">Observers</th>
                <th className="text-left p-2">Stale</th>
                <th className="text-left p-2">Atualizada</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="p-2 font-mono truncate max-w-[420px]" title={r.key}>{r.key}</td>
                  <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="p-2">{r.fetchStatus}</td>
                  <td className="p-2">{r.observers}</td>
                  <td className="p-2">{r.stale ? "sim" : "não"}</td>
                  <td className="p-2">{r.dataUpdatedAt ? new Date(r.dataUpdatedAt).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhuma query no cache.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DeveloperShell>
  );
}
