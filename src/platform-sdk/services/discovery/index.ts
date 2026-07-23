/**
 * Discovery — consultas sobre o Service Registry.
 * Read-only. Não valida capabilities (isso é papel do consumer).
 */
import type { ServiceContractId } from "../contracts";
import { serviceRegistry, type ServiceRecord } from "../registry/registry";
import { versionSatisfies } from "../mesh/capability-resolver";

export interface DiscoveryQuery {
  contract?: ServiceContractId;
  pluginId?: string;
  version?: string;
  capability?: string;
  visibility?: ServiceRecord["visibility"];
}

export function discover(query: DiscoveryQuery = {}): ServiceRecord[] {
  return serviceRegistry.list().filter((r) => {
    if (query.contract && r.contract !== query.contract) return false;
    if (query.pluginId && r.pluginId !== query.pluginId) return false;
    if (query.visibility && r.visibility !== query.visibility) return false;
    if (query.version && !versionSatisfies(r.version, query.version)) return false;
    if (query.capability && !(r.requiresCapabilities ?? []).includes(query.capability)) return false;
    return true;
  });
}

export function listContracts(): { contract: string; providers: number }[] {
  const map = new Map<string, number>();
  for (const r of serviceRegistry.list()) map.set(r.contract, (map.get(r.contract) ?? 0) + 1);
  return Array.from(map, ([contract, providers]) => ({ contract, providers }));
}
