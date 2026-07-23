import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { collectCodeHealth } from "@/modules/developer-center";
import { StatCard } from "@/design-system/patterns/StatCard";

export default function CodeHealth() {
  const h = useMemo(() => collectCodeHealth(), []);
  return (
    <DeveloperShell title="Code Health" description="Sinais de qualidade derivados dos diagnósticos in-memory.">
      <section className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="Plugins OK" value={`${h.plugins.ok}/${h.plugins.total}`} tone={h.plugins.error ? "warning" : "success"} />
        <StatCard label="Plugins com erro" value={h.plugins.error} tone={h.plugins.error ? "danger" : "neutral"} />
        <StatCard label="Serviços registrados" value={h.services} />
        <StatCard label="Feature flags" value={h.featureFlags} />
        <StatCard label="AI SDK entries" value={h.sdkUsage.ai} />
        <StatCard label="Workflow ext." value={h.sdkUsage.workflow} />
        <StatCard label="Event listeners" value={h.sdkUsage.event} />
        <StatCard label="Experimental" value={h.experimental.length} tone={h.experimental.length ? "warning" : "neutral"} />
      </section>
      <Card className="p-4">
        <h2 className="ds-h3 mb-2">Notas</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {h.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </Card>
    </DeveloperShell>
  );
}
