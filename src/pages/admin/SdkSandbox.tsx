import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketplacePage from "@/plugins/marketplace/pages/MarketplacePage";
import {
  EXTENSION_POINTS,
  useEventHistory,
  usePlugins,
  usePluginCommands,
  pluginRegistry,
  useServices,
  useMeshEvents,
  bootstrapBuiltInProviders,
  listContracts,
} from "@/platform-sdk";
import type { ExtensionPointId } from "@/platform-sdk";
import { pluginHost } from "@/platform-sdk/runtime";
import { useHostDiagnostics } from "@/platform-sdk/runtime/hooks";
import HelloPlugin from "@/platform-sdk/runtime/plugins/hello";
import AICopilotPlugin from "@/plugins/ai-copilot";
import { copilotMeshSnapshot } from "@/plugins/ai-copilot";
import {
  useCopilotEvents,
  useCopilotDiagnostics,
  useCopilotMessages,
} from "@/plugins/ai-copilot";

/**
 * /admin/sdk — Developer Sandbox (read-only).
 * FEATURE 100 · Platform SDK infra.
 * FEATURE 101 · Plugin Host Runtime (HelloPlugin carregado neste escopo).
 */
export default function SdkSandboxPage() {
  const plugins = usePlugins();
  const commands = usePluginCommands();
  const history = useEventHistory();
  const issues = pluginRegistry.issues();
  const diag = useHostDiagnostics();
  const [booted, setBooted] = useState(false);
  const copilotEvents = useCopilotEvents();
  const copilotDiag = useCopilotDiagnostics();
  const copilotMessages = useCopilotMessages();

  useEffect(() => {
    // PLUGIN 003 — Service Mesh: providers built-in devem estar disponíveis
    // ANTES da ativação dos plugins consumidores (ex. AI Copilot).
    bootstrapBuiltInProviders();
    if (diag.initializedAt) {
      setBooted(true);
      return;
    }
    pluginHost
      .initialize([HelloPlugin, AICopilotPlugin])
      .finally(() => setBooted(true));
  }, [diag.initializedAt]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform SDK — Sandbox</h1>
        <p className="text-sm text-muted-foreground">
          Visão de leitura da infraestrutura de plugins (FEATURE 100) e do Plugin Host Runtime
          (FEATURE 101). Nenhum plugin é consumido fora deste painel.
        </p>
      </header>

      <Tabs defaultValue="sandbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>
        <TabsContent value="sandbox" className="space-y-6">

      {/* Host Runtime (FEATURE 101) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plugin Host Runtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge variant={booted ? "default" : "secondary"}>
              {booted ? "Inicializado" : "Inicializando…"}
            </Badge>
            <span className="text-muted-foreground">
              Init: {diag.initDurationMs.toFixed(1)}ms
            </span>
            <span className="text-muted-foreground">
              Scan: {diag.scan?.durationMs.toFixed(1) ?? "–"}ms
            </span>
            <span className="text-muted-foreground">
              Deps: {diag.dependencies?.durationMs.toFixed(1) ?? "–"}ms
            </span>
            <span className="text-muted-foreground">
              Plugins: {diag.plugins.length} · Rejeitados:{" "}
              {diag.plugins.filter((p) => p.status === "rejected").length}
            </span>
          </div>

          <Separator />

          {diag.plugins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plugin no host.</p>
          ) : (
            diag.plugins.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.id} · v{p.version} · {p.category}
                    {p.initMs !== undefined ? ` · init ${p.initMs.toFixed(1)}ms` : ""}
                  </div>
                  {p.error ? (
                    <div className="text-xs text-destructive">{p.error}</div>
                  ) : null}
                  {p.validation && p.validation.warnings.length > 0 ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      {p.validation.warnings.join(" · ")}
                    </div>
                  ) : null}
                </div>
                <Badge
                  variant={
                    p.status === "active"
                      ? "default"
                      : p.status === "rejected" || p.status === "error"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {p.status}
                </Badge>
              </div>
            ))
          )}

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Dependency graph (cadeias)
              </div>
              {diag.dependencies && Object.keys(diag.dependencies.chains).length > 0 ? (
                <ul className="space-y-1 font-mono text-xs">
                  {Object.entries(diag.dependencies.chains).map(([id, chain]) => (
                    <li key={id}>
                      {id} → {chain.length ? chain.join(" → ") : "∅"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Sem dependências.</p>
              )}
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Órfãos</div>
              <p className="text-xs">
                {diag.dependencies?.orphans.length
                  ? diag.dependencies.orphans.join(", ")
                  : "Nenhum"}
              </p>
              <div className="mt-2 mb-1 text-xs font-medium text-muted-foreground">
                Incompatíveis
              </div>
              <p className="text-xs">
                {diag.dependencies?.incompatible.length
                  ? diag.dependencies.incompatible.join(", ")
                  : "Nenhum"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Lifecycle events ({diag.lifecycleEvents.length})
            </div>
            {diag.lifecycleEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum hook executado.</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {diag.lifecycleEvents.map((e, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>
                      {e.pluginId} · {e.phase} · {e.durationMs.toFixed(2)}ms
                    </span>
                    {e.error ? (
                      <span className="text-destructive">{e.error}</span>
                    ) : (
                      <span className="text-muted-foreground">ok</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Registry (FEATURE 100) */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plugins carregados (registry)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plugins.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum plugin registrado.</p>
            ) : (
              plugins.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.id} · v{p.version} · {p.category}
                    </div>
                  </div>
                  <Badge
                    variant={
                      p.status === "active"
                        ? "default"
                        : p.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {p.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extension points</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            {EXTENSION_POINTS.map((slot) => {
              const count =
                pluginRegistry.widgets(slot as ExtensionPointId).length +
                pluginHost.widgets(slot as ExtensionPointId).length;
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="font-mono text-xs">{slot}</span>
                  <Badge variant="outline">{count} widget(s)</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Commands ({commands.length + pluginHost.commands().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[...commands, ...pluginHost.commands()].length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum command exposto.</p>
            ) : (
              [...commands, ...pluginHost.commands()].map((c) => (
                <div
                  key={`${c.pluginId}:${c.id}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.pluginId}
                    </span>{" "}
                    · {c.title}
                  </span>
                  {c.shortcut ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {c.shortcut}
                    </Badge>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dependency issues</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {issues.length === 0 && (diag.dependencies?.issues.length ?? 0) === 0 ? (
              <p className="text-muted-foreground">Nenhum problema detectado.</p>
            ) : (
              [...issues, ...(diag.dependencies?.issues ?? [])].map((i, idx) => (
                <div key={idx} className="rounded-md border border-destructive/40 p-2">
                  <div className="text-xs font-mono text-destructive">
                    {i.pluginId} · {i.kind}
                  </div>
                  <div>{i.detail}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event bus — últimos eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum evento emitido. O core ainda não publica na plataforma — plugins futuros
              alimentarão este buffer.
            </p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {history
                .slice()
                .reverse()
                .map((e, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span>{String(e.name)}</span>
                    <span className="text-muted-foreground">
                      {new Date(e.at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Copilot · Developer Tools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Diagnóstico do plugin <code>plugin.ai-copilot</code>. Mensagens em sessão:{" "}
            {copilotMessages.length}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Últimos prompts ({copilotDiag.length})
            </div>
            {copilotDiag.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Execute um command <code>copilot.*</code> para gerar prompts.
              </p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {copilotDiag.slice(0, 8).map((d, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between border-b border-border/40 pb-1"
                  >
                    <span>
                      {d.actionId} · {d.template} · {d.module}
                    </span>
                    <span className="text-muted-foreground">
                      ~{d.tokensEstimated} tok · {d.durationMs.toFixed(1)}ms
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              Plugin events ({copilotEvents.length})
            </div>
            {copilotEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum evento do Copilot ainda.</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {copilotEvents
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((e, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span>{String(e.name)}</span>
                      <span className="text-muted-foreground">
                        {new Date(e.at).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="marketplace">
          <MarketplacePage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}


