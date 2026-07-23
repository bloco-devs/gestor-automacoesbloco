/**
 * Integrity Center — checks read-only sobre Plugin Host, SDK, Service Mesh e
 * runtimes existentes. Nenhuma alteração no core.
 */
import { pluginHost } from "@/platform-sdk/runtime";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";

export type IntegritySeverity = "info" | "warning" | "error";

export interface IntegrityIssue {
  id: string;
  area: string;
  severity: IntegritySeverity;
  title: string;
  detail: string;
}

export function runIntegrityChecks(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // Plugin Host
  try {
    const diag = pluginHost.diagnostics();
    const seen = new Map<string, number>();
    for (const p of diag.plugins ?? []) {
      seen.set(p.id, (seen.get(p.id) ?? 0) + 1);
      if (p.status === "error") {
        issues.push({
          id: `plugin.error.${p.id}`,
          area: "Plugin Host",
          severity: "error",
          title: `Plugin em erro: ${p.id}`,
          detail: p.error ?? "sem detalhe",
        });
      }
      if (p.status === "loaded") {
        issues.push({
          id: `plugin.parado.${p.id}`,
          area: "Plugin Host",
          severity: "warning",
          title: `Plugin carregado e não ativo: ${p.id}`,
          detail: "Verifique se dependências foram resolvidas.",
        });
      }
    }
    for (const [id, n] of seen) {
      if (n > 1) {
        issues.push({
          id: `plugin.duplicado.${id}`,
          area: "Plugin Host",
          severity: "error",
          title: `Plugin duplicado: ${id}`,
          detail: `${n} instâncias registradas.`,
        });
      }
    }
  } catch (e) {
    issues.push({
      id: "plugin.diag.unavailable",
      area: "Plugin Host",
      severity: "warning",
      title: "Diagnóstico do Plugin Host indisponível",
      detail: (e as Error)?.message ?? "sem detalhe",
    });
  }

  // Service Mesh
  const mesh = meshEventHistory();
  const denied = mesh.filter((m) => m.kind === "capability.denied");
  const versionBad = mesh.filter((m) => m.kind === "version.incompatible");
  const missing = mesh.filter((m) => m.kind === "consumer.required-failed");
  if (denied.length)
    issues.push({
      id: "mesh.capabilities-denied",
      area: "Service Mesh",
      severity: "warning",
      title: `${denied.length} capabilities negadas nas últimas ${mesh.length} operações`,
      detail: denied.slice(0, 3).map((d) => d.detail ?? d.serviceId ?? "").join(" · "),
    });
  if (versionBad.length)
    issues.push({
      id: "mesh.version-incompatible",
      area: "Service Mesh",
      severity: "error",
      title: `${versionBad.length} incompatibilidades de versão`,
      detail: versionBad.slice(0, 3).map((d) => d.detail ?? d.contract ?? "").join(" · "),
    });
  if (missing.length)
    issues.push({
      id: "mesh.provider-missing",
      area: "Service Mesh",
      severity: "error",
      title: `${missing.length} providers requeridos ausentes`,
      detail: missing.slice(0, 3).map((d) => d.contract ?? d.serviceId ?? "").join(" · "),
    });

  return issues;
}
