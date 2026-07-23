/**
 * Service Mesh — fachada única de alto nível.
 * Plugins importam APENAS `serviceMesh` (ou os helpers).
 */
import type { ServiceContractId, ServiceContractMap } from "../contracts";
import { serviceRegistry } from "../registry/registry";
import { provide, disposeAllForPlugin, type ProvideOptions, type ProviderHandle } from "../providers";
import { resolve, optional, required, describe, type ResolveOptions } from "../consumer";
import { discover, listContracts, type DiscoveryQuery } from "../discovery";
import { meshEventHistory, subscribeMeshEvents } from "../diagnostics";

export const serviceMesh = {
  /** Publicar serviço. */
  provide<C extends ServiceContractId>(opts: ProvideOptions<C>): ProviderHandle {
    return provide(opts);
  },
  /** Remover todos os serviços de um plugin (host chama no disable). */
  disposeAllForPlugin,
  /** Descoberta. */
  discover(query?: DiscoveryQuery) {
    return discover(query);
  },
  contracts: listContracts,
  /** Consumo tipado. */
  resolve<C extends ServiceContractId>(contract: C, opts: ResolveOptions): ServiceContractMap[C] {
    return resolve(contract, opts);
  },
  optional<C extends ServiceContractId>(contract: C, opts: ResolveOptions): ServiceContractMap[C] | null {
    return optional(contract, opts);
  },
  required<C extends ServiceContractId>(contract: C, opts: ResolveOptions): ServiceContractMap[C] {
    return required(contract, opts);
  },
  describe,
  /** Registry raw (read-only recomendado). */
  registry: {
    list: () => serviceRegistry.list(),
    get: (id: string) => serviceRegistry.get(id),
    subscribe: (l: () => void) => serviceRegistry.subscribe(l),
  },
  /** Diagnostics. */
  diagnostics: {
    history: meshEventHistory,
    subscribe: subscribeMeshEvents,
  },
};

export type ServiceMesh = typeof serviceMesh;
