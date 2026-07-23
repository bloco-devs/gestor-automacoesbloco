/**
 * Provider helpers — o lado que PUBLICA um serviço no Mesh.
 * A responsabilidade é apenas descrever + registrar. A implementação é
 * fornecida pelo plugin dono.
 */
import type { ServiceContractId, ServiceContractMap } from "../contracts";
import {
  serviceRegistry,
  type ServiceRecord,
  type ServiceVisibility,
  type ServiceHealth,
} from "../registry/registry";
import { recordMeshEvent } from "../diagnostics";

export interface ProvideOptions<C extends ServiceContractId> {
  id: string;
  pluginId: string;
  contract: C;
  version: string;
  visibility?: ServiceVisibility;
  requiresCapabilities?: string[];
  impl: ServiceContractMap[C];
  /** Opcional. Chamado pelo mesh para health-check on-demand. */
  health?: () => Promise<ServiceHealth> | ServiceHealth;
}

export interface ProviderHandle {
  readonly id: string;
  dispose(): void;
  reportHealth(h: Partial<ServiceHealth>): void;
  runHealthCheck(): Promise<ServiceHealth | null>;
}

const healthProbes = new Map<string, () => Promise<ServiceHealth> | ServiceHealth>();

export function provide<C extends ServiceContractId>(opts: ProvideOptions<C>): ProviderHandle {
  const record = serviceRegistry.register({
    id: opts.id,
    pluginId: opts.pluginId,
    contract: opts.contract,
    version: opts.version,
    visibility: opts.visibility ?? "public",
    requiresCapabilities: opts.requiresCapabilities,
    impl: opts.impl,
  } as Omit<ServiceRecord<C>, "registeredAt" | "health" | "resolveCount">);

  if (opts.health) healthProbes.set(opts.id, opts.health);

  recordMeshEvent({
    kind: "provider.registered",
    pluginId: opts.pluginId,
    serviceId: opts.id,
    contract: opts.contract,
    detail: `v${opts.version} · ${opts.visibility ?? "public"}`,
  });

  return {
    id: record.id,
    dispose() {
      healthProbes.delete(opts.id);
      serviceRegistry.unregister(opts.id);
      recordMeshEvent({
        kind: "provider.disposed",
        pluginId: opts.pluginId,
        serviceId: opts.id,
        contract: opts.contract,
      });
    },
    reportHealth(h) {
      serviceRegistry.updateHealth(opts.id, h);
      recordMeshEvent({
        kind: "health.updated",
        pluginId: opts.pluginId,
        serviceId: opts.id,
        contract: opts.contract,
        detail: h.status,
      });
    },
    async runHealthCheck() {
      const probe = healthProbes.get(opts.id);
      if (!probe) return null;
      try {
        const result = await probe();
        serviceRegistry.updateHealth(opts.id, result);
        return result;
      } catch (err) {
        const health: ServiceHealth = {
          status: "down",
          message: err instanceof Error ? err.message : String(err),
          at: Date.now(),
        };
        serviceRegistry.updateHealth(opts.id, health);
        return health;
      }
    },
  };
}

/** Remove todos os serviços de um plugin (usado ao desativar plugins). */
export function disposeAllForPlugin(pluginId: string): void {
  for (const rec of serviceRegistry.list()) {
    if (rec.pluginId === pluginId) {
      healthProbes.delete(rec.id);
      serviceRegistry.unregister(rec.id);
      recordMeshEvent({
        kind: "provider.disposed",
        pluginId,
        serviceId: rec.id,
        contract: rec.contract,
      });
    }
  }
}
