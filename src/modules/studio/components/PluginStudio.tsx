import { memo } from "react";
import { Section, StatCard, KpiRow } from "@/design-system";
import { Badge } from "@/components/ui/badge";

/**
 * PluginStudio — visão read-only das superfícies extensíveis que o Studio
 * pretende preencher. Não altera o Plugin Runtime.
 */
const SURFACES = [
  { id: "sidebar", label: "Sidebar", desc: "Itens de navegação lateral." },
  { id: "command", label: "Commands", desc: "Ações no Command Palette." },
  { id: "widget.dashboard", label: "Dashboard Widgets", desc: "Cartões no dashboard operacional." },
  { id: "widget.workspace", label: "Workspace Widgets", desc: "Painéis no Developer Workspace." },
  { id: "context.panel", label: "Context Panels", desc: "Painéis contextuais no Copilot." },
  { id: "copilot.action", label: "Copilot Actions", desc: "Ações sugeridas pelo AI Copilot." },
];

function PluginStudioInner() {
  return (
    <Section
      title="Plugin Studio"
      description="Superfícies do Plugin SDK disponíveis para montagem visual (rascunho)."
    >
      <KpiRow>
        <StatCard label="Superfícies" value={SURFACES.length} />
        <StatCard label="Extension Host" value="OK" tone="success" />
        <StatCard label="Marketplace" value="Read-only" tone="info" />
      </KpiRow>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {SURFACES.map((s) => (
          <div key={s.id} className="border rounded-md p-3 bg-card">
            <div className="flex items-center justify-between">
              <p className="font-medium">{s.label}</p>
              <Badge variant="outline">{s.id}</Badge>
            </div>
            <p className="ds-caption text-muted-foreground mt-1">{s.desc}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export const PluginStudio = memo(PluginStudioInner);
