/**
 * WorkflowSdkPanel — visão read-only para o Sandbox.
 * PLUGIN 005.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWorkflowSdkDiagnostics } from "@/platform-sdk/workflow-sdk";

const KIND_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  trigger: "default",
  action: "secondary",
  condition: "outline",
  validator: "outline",
  transformer: "outline",
  hook: "outline",
};

export default function WorkflowSdkPanel() {
  const diag = useWorkflowSdkDiagnostics();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workflow SDK</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge>{diag.total} extensões</Badge>
            {Object.entries(diag.byKind).map(([k, n]) => (
              <span key={k} className="text-muted-foreground">
                {k}: {n}
              </span>
            ))}
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(diag.byPlugin).map(([id, n]) => (
              <Badge key={id} variant="outline">
                {id} · {n}
              </Badge>
            ))}
            {diag.total === 0 ? (
              <span className="text-muted-foreground">
                Nenhum plugin registrou extensões ainda.
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extensões registradas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {diag.extensions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada registrado.</p>
          ) : (
            diag.extensions.map((e) => (
              <div
                key={`${e.kind}:${e.id}`}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm"
              >
                <Badge variant={KIND_COLORS[e.kind] ?? "outline"}>{e.kind}</Badge>
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.id}</span>
                {e.category ? (
                  <Badge variant="secondary">{e.category}</Badge>
                ) : null}
                <span className="ml-auto text-xs text-muted-foreground">
                  {e.pluginId}
                  {e.version ? ` · v${e.version}` : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
