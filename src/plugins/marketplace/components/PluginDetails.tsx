import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import type { CatalogEntry } from "../types";
import { useCompatibility, usePluginHealth } from "../hooks";
import { pluginManager } from "../manager";
import { HealthBadge } from "./HealthBadge";

interface Props {
  entry: CatalogEntry;
}

export function PluginDetails({ entry }: Props) {
  const health = usePluginHealth(entry);
  const compat = useCompatibility(entry);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: "enable" | "disable" | "reload" | "restart" | "simulateUpdate") {
    setBusy(action);
    const result = await pluginManager[action](entry.id);
    toast({
      title: result.ok ? "Sucesso" : "Falha",
      description: result.message,
      variant: result.ok ? "default" : "destructive",
    });
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{entry.name}</h2>
          <Badge variant="outline">v{entry.version}</Badge>
          <Badge variant="outline">{entry.category}</Badge>
          <Badge variant="outline">{entry.origin}</Badge>
          <HealthBadge health={health} />
        </div>
        <p className="text-xs text-muted-foreground">
          {entry.id}
          {entry.author ? ` · ${entry.author}` : ""}
        </p>
        {entry.description && <p className="text-sm">{entry.description}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={entry.status !== "disabled" || !!busy}
          onClick={() => run("enable")}
        >
          Enable
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={entry.status !== "active" || !!busy}
          onClick={() => run("disable")}
        >
          Disable
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={entry.status !== "active" || !!busy}
          onClick={() => run("reload")}
        >
          Reload
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={entry.status !== "active" || !!busy}
          onClick={() => run("restart")}
        >
          Restart
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={entry.status !== "active" || !!busy}
          onClick={() => run("simulateUpdate")}
        >
          Simular update
        </Button>
      </div>

      <Separator />

      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Manifest</h3>
          <ul className="space-y-1 text-xs">
            <li>Commands: {entry.commands}</li>
            <li>Widgets: {entry.widgets}</li>
            <li>Extension points: {entry.extensionPoints.join(", ") || "—"}</li>
            <li>Dependências: {entry.dependencies.map((d) => d.pluginId).join(", ") || "—"}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Capabilities</h3>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Requires: </span>
              {entry.capabilitiesRequired.join(", ") || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Provides: </span>
              {entry.capabilitiesProvided.join(", ") || "—"}
            </div>
          </div>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Health</h3>
          <ul className="space-y-1 text-xs">
            <li>Load time: {health?.loadTimeMs.toFixed(2) ?? 0} ms</li>
            <li>Memory (est.): {health?.memoryEstimateKb ?? 0} KB</li>
            <li>Errors: {health?.errorCount ?? 0}</li>
            <li>
              Último evento:{" "}
              {health?.lastEventAt ? new Date(health.lastEventAt).toLocaleTimeString() : "—"}
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Compatibilidade</h3>
          <ul className="space-y-1 text-xs">
            <li>SDK: {compat?.sdkVersion}</li>
            <li>Host: {compat?.hostVersion}</li>
            <li>
              Status:{" "}
              <Badge variant={compat?.compatible ? "default" : "destructive"}>
                {compat?.compatible ? "compatível" : "incompatível"}
              </Badge>
            </li>
            {compat?.reasons.map((r, i) => (
              <li key={i} className="text-destructive">
                {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {(entry.issues.length > 0 || entry.warnings.length > 0) && (
        <section>
          <h3 className="mb-1 text-xs font-medium text-muted-foreground">Issues</h3>
          {entry.issues.map((i, idx) => (
            <p key={idx} className="text-xs text-destructive">
              {i}
            </p>
          ))}
          {entry.warnings.map((w, idx) => (
            <p key={idx} className="text-xs text-amber-600 dark:text-amber-400">
              {w}
            </p>
          ))}
        </section>
      )}
    </div>
  );
}
