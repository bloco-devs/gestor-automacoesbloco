import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  EXTENSION_POINTS,
  useEventHistory,
  usePlugins,
  usePluginCommands,
  pluginRegistry,
} from "@/platform-sdk";
import type { ExtensionPointId } from "@/platform-sdk";

/**
 * /admin/sdk — Developer Sandbox (read-only).
 * Mostra plugins carregados, extension points, widgets, commands e eventos.
 */
export default function SdkSandboxPage() {
  const plugins = usePlugins();
  const commands = usePluginCommands();
  const history = useEventHistory();
  const issues = pluginRegistry.issues();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Platform SDK — Sandbox</h1>
        <p className="text-sm text-muted-foreground">
          Visão de leitura da infraestrutura de plugins. FEATURE 100 · nenhum plugin é ativado por
          padrão.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plugins carregados</CardTitle>
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
              const count = pluginRegistry.widgets(slot as ExtensionPointId).length;
              return (
                <div key={slot} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="font-mono text-xs">{slot}</span>
                  <Badge variant="outline">{count} widget(s)</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Commands registrados ({commands.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {commands.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum command exposto por plugins.</p>
            ) : (
              commands.map((c) => (
                <div key={`${c.pluginId}:${c.id}`} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">{c.pluginId}</span>{" "}
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
            {issues.length === 0 ? (
              <p className="text-muted-foreground">Nenhum problema detectado.</p>
            ) : (
              issues.map((i, idx) => (
                <div key={idx} className="rounded-md border border-destructive/40 p-2">
                  <div className="text-xs font-mono text-destructive">{i.kind}</div>
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
    </div>
  );
}
