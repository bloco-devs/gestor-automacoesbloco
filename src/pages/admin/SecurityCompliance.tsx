import { memo, useMemo, useState } from "react";
import { FileWarning } from "lucide-react";
import { PageShell, PageHeader, Section, StatCard, KpiRow } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { FRAMEWORKS, scoreFramework, frameworkPending, type ComplianceFramework } from "@/modules/security";

function ComplianceCard({ fw }: { fw: ComplianceFramework }) {
  const score = scoreFramework(fw);
  const pending = frameworkPending(fw);
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ds-h3">{fw.label}</div>
          <div className="ds-caption text-muted-foreground">{fw.description}</div>
        </div>
        <div className={`ds-h2 tabular-nums ${score >= 85 ? "text-success" : score >= 70 ? "text-warning" : "text-destructive"}`}>{score}%</div>
      </div>
      <div className="mt-3 space-y-1">
        {fw.items.map((it) => (
          <div key={it.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{it.label}</span>
            <Badge variant="outline" className={
              it.status === "covered" ? "border-success text-success" :
              it.status === "partial" ? "border-warning text-warning" :
              "border-destructive text-destructive"
            }>{it.status}</Badge>
          </div>
        ))}
      </div>
      {pending.length ? (
        <div className="mt-3 ds-caption text-muted-foreground">
          Pendências: {pending.map((p) => p.label).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

function SecurityCompliancePageImpl() {
  const [selected, setSelected] = useState<ComplianceFramework["id"] | "all">("all");
  const visible = useMemo(() => (selected === "all" ? FRAMEWORKS : FRAMEWORKS.filter((f) => f.id === selected)), [selected]);
  const avg = useMemo(() => Math.round(FRAMEWORKS.reduce((s, f) => s + scoreFramework(f), 0) / FRAMEWORKS.length), []);

  return (
    <PageShell>
      <PageHeader title="Compliance Center" subtitle="LGPD · ISO 27001 · OWASP · SOC 2 · NIST." icon={<FileWarning className="h-6 w-6" aria-hidden />} />

      <KpiRow>
        <StatCard label="Média geral" value={`${avg}%`} tone={avg >= 85 ? "success" : "warning"} />
        {FRAMEWORKS.map((fw) => (
          <StatCard key={fw.id} label={fw.label} value={`${scoreFramework(fw)}%`} tone="info" hint={`${fw.items.length} itens`} />
        ))}
      </KpiRow>

      <div className="flex gap-2 flex-wrap">
        <button className={`px-3 py-1 rounded-full text-sm border ${selected === "all" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSelected("all")}>Todos</button>
        {FRAMEWORKS.map((fw) => (
          <button key={fw.id} className={`px-3 py-1 rounded-full text-sm border ${selected === fw.id ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSelected(fw.id)}>{fw.label}</button>
        ))}
      </div>

      <Section title="Frameworks">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {visible.map((fw) => <ComplianceCard key={fw.id} fw={fw} />)}
        </div>
      </Section>
    </PageShell>
  );
}

export default memo(SecurityCompliancePageImpl);
