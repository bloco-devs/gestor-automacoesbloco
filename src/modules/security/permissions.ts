/**
 * Permission Explorer — coleta read-only de capacidades registradas no
 * Platform SDK, Plugin Host e Service Mesh. Não altera o RBAC.
 */
import { pluginHost } from "@/platform-sdk/runtime";
import { platformPermissions } from "@/platform-sdk/permissions/permissions";

export interface PermissionNode {
  id: string;
  label: string;
  kind: "role" | "plugin" | "capability" | "command" | "widget" | "service" | "workflow-ext" | "event-ext" | "ai-skill" | "agent";
  parentId?: string;
  detail?: string;
}

export function collectPermissionTree(): PermissionNode[] {
  const nodes: PermissionNode[] = [];

  // Roles conhecidos no app
  for (const r of ["administrator", "developer", "builder", "requester"] as const) {
    nodes.push({ id: `role:${r}`, label: r, kind: "role", detail: "Papel do RBAC do app" });
  }

  // Plugins do Host
  try {
    const diag = pluginHost.diagnostics();
    for (const p of diag.plugins ?? []) {
      const pid = `plugin:${p.id}`;
      nodes.push({
        id: pid,
        label: p.id,
        kind: "plugin",
        detail: `${p.status} · ${p.status === "active" ? "ativo" : "inativo"}`,
      });
      const caps = platformPermissions.listForPlugin(p.id);
      for (const c of caps) {
        nodes.push({ id: `${pid}:cap:${c}`, parentId: pid, label: c, kind: "capability" });
      }
    }
  } catch {
    /* diagnóstico indisponível */
  }

  return nodes;
}
