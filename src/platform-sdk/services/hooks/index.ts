/**
 * Hooks React para o Service Mesh. Read-only.
 */
import { useSyncExternalStore, useMemo } from "react";
import { serviceRegistry, type ServiceRecord } from "../registry/registry";
import { meshEventHistory, subscribeMeshEvents, type MeshEvent } from "../diagnostics";
import type { ServiceContractId, ServiceContractMap } from "../contracts";
import { optional as consumerOptional, type ResolveOptions } from "../consumer";
import { stableSnapshot } from "@/lib/stable-snapshot";

const getServices = stableSnapshot(() => serviceRegistry.list());
const getMeshEvents = stableSnapshot(meshEventHistory);

export function useServices(): ServiceRecord[] {
  return useSyncExternalStore(
    (l) => serviceRegistry.subscribe(l),
    getServices,
    getServices,
  );
}

export function useServicesByContract<C extends ServiceContractId>(contract: C): ServiceRecord<C>[] {
  const all = useServices();
  return useMemo(
    () => all.filter((r): r is ServiceRecord<C> => r.contract === contract),
    [all, contract],
  );
}

export function useMeshEvents(): ReadonlyArray<MeshEvent> {
  return useSyncExternalStore(subscribeMeshEvents, getMeshEvents, getMeshEvents);
}

/** Resolve reativo. Retorna null se ainda não há provider. */
export function useService<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
): ServiceContractMap[C] | null {
  const list = useServicesByContract(contract);
  return useMemo(() => {
    if (list.length === 0) return null;
    return consumerOptional(contract, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.length, contract, opts.consumerId, opts.version, opts.preferServiceId]);
}
