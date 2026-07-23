import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IntegrationShell } from "@/modules/integrations/IntegrationShell";
import { StatCard } from "@/design-system/patterns/StatCard";
import { INTEGRATION_ROUTES, getIntegrationOverview, getIntegrationDiagnostics } from "@/modules/integrations";
import { Activity, Boxes, Cable, Cpu, Layers, Webhook } from "lucide-react";

export default function IntegrationsOverview() {
  const overview = useMemo(() => getIntegrationOverview(), []);
  const diag = useMemo(() => getIntegrationDiagnostics(), []);

  return (
    <IntegrationShell
      title="Integration Hub"
      description="Camada oficial de integrações — APIs, Webhooks, Connectors, Service Mesh e SDKs. Somente leitura."
    >
      <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Edge Functions" value={overview.edgeFunctions} icon={Cable} tone="info" />
        <StatCard label="Contratos (Mesh)" value={overview.meshContracts} icon={Layers} />
        <StatCard label="Providers" value={overview.meshProviders} icon={Boxes} />
        <StatCard label="Conectores" value={`${overview.connectors.active}/${overview.connectors.total}`} icon={Cpu} />
        <StatCard label="Webhooks" value={overview.webhooks.total} icon={Webhook} tone={overview.webhooks.failed ? "danger" : "neutral"} />
        <StatCard label="Health score" value={diag.healthScore} tone={diag.healthScore >= 90 ? "success" : diag.healthScore >= 70 ? "warning" : "danger"} icon={Activity} />
      </section>

      <Card className="p-4">
        <h2 className="ds-h3 mb-2">Runtimes ativos</h2>
        <p className="text-sm text-muted-foreground">
          {overview.runtimesGreen}/{overview.runtimes} verdes · {overview.plugins} plugins ({overview.pluginsError} em erro) ·
          {" "}{overview.aiSkills} AI skills · {overview.workflowExtensions} extensões de workflow · latência média {diag.avgLatencyMs}ms ·
          {" "}disponibilidade {diag.availabilityPct}%.
        </p>
      </Card>

      <section>
        <h2 className="ds-h3 mb-3">Módulos</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {INTEGRATION_ROUTES.filter((r) => r.to !== "/admin/integrations").map((r) => (
            <NavLink key={r.to} to={r.to} className="group">
              <Card className="p-4 h-full transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-medium group-hover:text-primary">{r.label}</h3>
                  <Badge variant="outline" className="text-[10px]">Onda {r.wave}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </Card>
            </NavLink>
          ))}
        </div>
      </section>
    </IntegrationShell>
  );
}
