import { memo, useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { PageShell, PageHeader, Section, Toolbar, StatCard, KpiRow, EmptyPanel } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuditHistory } from "@/modules/audit";
import { useErrorHistory } from "@/modules/errors";
import { useThreatHistory, collectTimeline, timelineToCsv, downloadCsv, type TimelineSource } from "@/modules/security";

const SOURCES: Array<TimelineSource | "all"> = ["all", "audit", "error", "threat", "mesh"];

function SecurityTimelinePageImpl() {
  // Assinar os stores para re-render em tempo real.
  useAuditHistory();
  useErrorHistory();
  useThreatHistory();

  const [q, setQ] = useState("");
  const [source, setSource] = useState<TimelineSource | "all">("all");

  const timeline = useMemo(() => collectTimeline(), []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return timeline.filter((e) => {
      if (source !== "all" && e.source !== source) return false;
      if (!query) return true;
      return `${e.title} ${e.detail ?? ""} ${e.origin ?? ""}`.toLowerCase().includes(query);
    });
  }, [timeline, q, source]);

  const counts = useMemo(() => ({
    total: timeline.length,
    audit: timeline.filter((e) => e.source === "audit").length,
    error: timeline.filter((e) => e.source === "error").length,
    threat: timeline.filter((e) => e.source === "threat").length,
    mesh: timeline.filter((e) => e.source === "mesh").length,
  }), [timeline]);

  return (
    <PageShell>
      <PageHeader
        title="Security Timeline"
        subtitle="Eventos unificados de Audit, Errors, Threats e Service Mesh."
        icon={<Activity className="size-6" aria-hidden />}
        actions={
          <Button variant="outline" size="sm" onClick={() => downloadCsv(`timeline-${Date.now()}.csv`, timelineToCsv(filtered))}>
            Exportar CSV
          </Button>
        }
      />
      <KpiRow>
        <StatCard label="Total" value={counts.total} />
        <StatCard label="Audit" value={counts.audit} tone="info" />
        <StatCard label="Errors" value={counts.error} tone="danger" />
        <StatCard label="Threats" value={counts.threat} tone="warning" />
        <StatCard label="Mesh" value={counts.mesh} />
      </KpiRow>

      <Section title="Trilha unificada">
        <Toolbar className="mb-3">
          <Input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <select className="border rounded-md px-2 py-1 text-sm" value={source} onChange={(e) => setSource(e.target.value as TimelineSource | "all")}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Toolbar>
        {filtered.length === 0 ? (
          <EmptyPanel title="Sem eventos" description="Ainda não há eventos coletados neste escopo." />
        ) : (
          <div className="rounded-2xl border divide-y">
            {filtered.slice(0, 500).map((e) => (
              <div key={e.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{e.source}</Badge>
                    <span className="ds-caption text-muted-foreground">{new Date(e.at).toLocaleString()}</span>
                    {e.origin ? <span className="ds-caption text-muted-foreground">· {e.origin}</span> : null}
                  </div>
                  <div className="text-sm mt-1">{e.title}</div>
                  {e.detail ? <div className="ds-caption text-muted-foreground line-clamp-2">{e.detail}</div> : null}
                </div>
                <Badge variant="outline" className={
                  e.level === "error" ? "border-destructive text-destructive" :
                  e.level === "warning" ? "border-warning text-warning" : ""
                }>{e.level}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(SecurityTimelinePageImpl);
