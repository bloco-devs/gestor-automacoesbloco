import { memo } from "react";
import { FileCode2 } from "lucide-react";
import { PageShell, PageHeader, Section } from "@/design-system";
import { Button } from "@/components/ui/button";
import { REPORTS, downloadCsv } from "@/modules/security";

function SecurityReportsPageImpl() {
  return (
    <PageShell>
      <PageHeader title="Enterprise Reports" subtitle="Exportação CSV consolidada — Security, Compliance, Audit, Governance, Plugins, SDK, Mesh, Architecture, Timeline." icon={<FileCode2 className="h-6 w-6" aria-hidden />} />
      <Section title="Relatórios">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {REPORTS.map((r) => (
            <div key={r.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3">
              <div>
                <div className="ds-h3">{r.label}</div>
                <div className="ds-caption text-muted-foreground">CSV · Read-only</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadCsv(`${r.id}-${Date.now()}.csv`, r.build())}>
                Exportar
              </Button>
            </div>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}

export default memo(SecurityReportsPageImpl);
