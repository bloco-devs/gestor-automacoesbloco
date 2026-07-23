import { memo, useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { PageShell, PageHeader, Section, EmptyPanel } from "@/design-system";
import { Badge } from "@/components/ui/badge";
import { runIntegrityChecks } from "@/modules/security";

export function IntegrityInline({ limit }: { limit?: number }) {
  const issues = useMemo(() => runIntegrityChecks(), []);
  const list = typeof limit === "number" ? issues.slice(0, limit) : issues;
  if (list.length === 0) {
    return <EmptyPanel title="Sem achados" description="Todos os checks de integridade passaram." />;
  }
  return (
    <div className="rounded-2xl border divide-y">
      {list.map((i) => (
        <div key={i.id} className="p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{i.area}</Badge>
              <span className="ds-h3 truncate">{i.title}</span>
            </div>
            <div className="ds-caption text-muted-foreground mt-1 line-clamp-2">{i.detail}</div>
          </div>
          <Badge variant="outline" className={
            i.severity === "error" ? "border-destructive text-destructive" :
            i.severity === "warning" ? "border-warning text-warning" : ""
          }>{i.severity}</Badge>
        </div>
      ))}
    </div>
  );
}

function SecurityIntegrityPageImpl() {
  return (
    <PageShell>
      <PageHeader title="Integrity Center" subtitle="Assinaturas, providers, versões e dependências." icon={<ShieldCheck className="h-6 w-6" aria-hidden />} />
      <Section title="Achados">
        <IntegrityInline />
      </Section>
    </PageShell>
  );
}

export default memo(SecurityIntegrityPageImpl);
