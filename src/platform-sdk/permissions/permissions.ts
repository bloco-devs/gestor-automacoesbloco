import type { PermissionsAPI } from "../types";

/**
 * Camada complementar ao RBAC do app. NÃO substitui `ProtectedRoute` nem RLS.
 * Cada plugin declara capacidades e o host aprova (ou não) explicitamente.
 */
export function createPermissions(): PermissionsAPI {
  const grants = new Map<string, Set<string>>();

  const ensure = (pluginId: string) => {
    let set = grants.get(pluginId);
    if (!set) {
      set = new Set();
      grants.set(pluginId, set);
    }
    return set;
  };

  return {
    grant(pluginId, capability) {
      ensure(pluginId).add(capability);
    },
    revoke(pluginId, capability) {
      grants.get(pluginId)?.delete(capability);
    },
    can(pluginId, capability) {
      return grants.get(pluginId)?.has(capability) ?? false;
    },
    listForPlugin(pluginId) {
      return Array.from(grants.get(pluginId) ?? []);
    },
  };
}

export const platformPermissions: PermissionsAPI = createPermissions();
