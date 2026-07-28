import { useMemo, useState } from "react";
import { FileWarning, Download } from "lucide-react";
import { PageShell, PageHeader, Section, EmptyPanel, Toolbar } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuditHistory, auditToCsv, type AuditType } from "@/modules/audit";

const TYPES: AuditType[] = [
  "login", "logout", "permission", "workflow", "plugin", "marketplace",
  "ai", "knowledge", "analytics", "portal", "workspace", "sdk", "config", "flag", "other",
];

export default function AuditCenterPage() {
  const events = useAuditHistory();
  const [q, setQ] = useState("");
  const [type, setType] = useState<AuditType | "all">("all");

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (type !== "all" && e.type !== type) return false;
        if (q && !`${e.actor ?? ""} ${e.detail ?? ""} ${e.origin ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [events, q, type],
  );

  const exportCsv = () => {
    const csv = auditToCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell>
      <PageHeader
        title="Audit Center"
        subtitle="Trilha unificada de eventos. Sem alterar backend — buffer local."
        icon={<FileWarning className="size-6" />}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="mr-1 size-4" /> CSV
          </Button>
        }
      />

      <Section>
        <Toolbar>
          <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as AuditType | "all")}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos os tipos</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Toolbar>
      </Section>

      <Section>
        {filtered.length === 0 ? (
          <EmptyPanel title="Nenhum evento" description="Auditoria vazia neste filtro." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {filtered.map((e) => (
              <li key={e.id} className="p-3 flex items-start gap-3">
                <Badge variant={e.result === "failure" ? "destructive" : e.result === "warning" ? "secondary" : "outline"} className="text-[10px] uppercase">
                  {e.result}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    <span className="font-mono">{e.type}</span>
                    {e.actor ? <> · {e.actor}</> : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(e.at).toLocaleString()}{e.origin ? ` · ${e.origin}` : ""}
                  </div>
                  {e.detail && <div className="mt-1 text-xs text-muted-foreground truncate">{e.detail}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}
