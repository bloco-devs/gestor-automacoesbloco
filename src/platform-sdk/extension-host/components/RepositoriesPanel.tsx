/**
 * RepositoriesPanel — visão read-only dos repositórios registrados.
 * PLUGIN 004. Consumido pelo SdkSandbox.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  pluginRepositoryRegistry,
  diagnoseRepositories,
  type RepositoryDiagnosticsReport,
} from "@/platform-sdk/extension-host";
import { ensureRepositoriesBootstrapped } from "@/plugins/marketplace/registry";

export default function RepositoriesPanel() {
  const [report, setReport] = useState<RepositoryDiagnosticsReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureRepositoriesBootstrapped();
    diagnoseRepositories(pluginRepositoryRegistry).then((r) => {
      if (!cancelled) setReport(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!report) {
    return <p className="text-sm text-muted-foreground">Carregando repositórios…</p>;
  }

  const repos = pluginRepositoryRegistry.list();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repositórios registrados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge>{repos.length} repositórios</Badge>
            <span className="text-muted-foreground">
              Packages: {report.totalPackages}
            </span>
            <span className="text-muted-foreground">
              Válidos: {report.summary.valid} · Inválidos: {report.summary.invalid}
            </span>
            <span className="text-muted-foreground">
              Assinados: {report.summary.signed} · Trusted: {report.summary.trusted}
            </span>
            <span className="text-muted-foreground">
              Incompatíveis: {report.summary.incompatible}
            </span>
          </div>
          <Separator />
          <div className="grid gap-2 md:grid-cols-3">
            {repos.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.label}</span>
                  <Badge variant="secondary">{r.kind}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">id: {r.id}</div>
                <div className="mt-1 text-xs">
                  Packages:{" "}
                  {report.entries.filter((e) => e.repository === r.id).length}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum package descoberto pelos repositórios.
            </p>
          ) : (
            report.entries.map((e) => (
              <div
                key={`${e.repository}:${e.packageId}`}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.packageId}</span>
                  <Badge variant="secondary">v{e.version}</Badge>
                  <Badge variant="outline">{e.repository}</Badge>
                  <Badge variant={e.valid ? "default" : "destructive"}>
                    {e.valid ? "válido" : "inválido"}
                  </Badge>
                  <Badge
                    variant={
                      e.integrity === "ok"
                        ? "default"
                        : e.integrity === "unsigned"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    integridade: {e.integrity}
                  </Badge>
                  <Badge variant={e.signature.trusted ? "default" : "secondary"}>
                    {e.signature.trusted ? "trusted" : "untrusted"}
                  </Badge>
                  <Badge variant={e.compatibility.ok ? "default" : "destructive"}>
                    {e.compatibility.ok ? "compatível" : "incompatível"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  fingerprint: {e.signature.fingerprint || "—"}
                </div>
                {e.errors.length > 0 ? (
                  <div className="mt-1 text-xs text-destructive">
                    {e.errors.join("; ")}
                  </div>
                ) : null}
                {e.compatibility.reasons.length > 0 ? (
                  <div className="mt-1 text-xs text-amber-600">
                    {e.compatibility.reasons.join("; ")}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
