/**
 * Consumer API — o lado que USA serviços do Mesh.
 * `resolve` / `optional` / `required` são as três formas oficiais.
 * Nenhum consumidor importa código do plugin fornecedor.
 */
import type { ServiceContractId, ServiceContractMap } from "../contracts";
import { serviceRegistry, type ServiceRecord } from "../registry/registry";
import {
  checkCapabilities,
  versionSatisfies,
} from "../mesh/capability-resolver";
import { recordMeshEvent } from "../diagnostics";

export interface ResolveOptions {
  /** Plugin que consome (para checagem de capabilities). */
  consumerId: string;
  /** Semver requerido (ex: "^1.0.0"). */
  version?: string;
  /** Preferência por serviceId específico se houver múltiplos providers. */
  preferServiceId?: string;
}

function selectBest<C extends ServiceContractId>(
  candidates: ServiceRecord<C>[],
  opts: ResolveOptions,
): ServiceRecord<C> | undefined {
  if (opts.preferServiceId) {
    const hit = candidates.find((c) => c.id === opts.preferServiceId);
    if (hit) return hit;
  }
  const filtered = opts.version
    ? candidates.filter((c) => versionSatisfies(c.version, opts.version))
    : candidates;
  // Preferir "healthy", depois "unknown", nunca "down".
  const rank = (s: ServiceRecord["health"]["status"]) =>
    s === "healthy" ? 0 : s === "unknown" ? 1 : s === "degraded" ? 2 : 3;
  return filtered.slice().sort((a, b) => rank(a.health.status) - rank(b.health.status))[0];
}

/**
 * Retorna a implementação tipada. Lança se falhar.
 */
export function resolve<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
): ServiceContractMap[C] {
  const record = _pick(contract, opts, /*required*/ true);
  return record.impl;
}

/**
 * Retorna `null` se nada resolver. Nunca lança.
 */
export function optional<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
): ServiceContractMap[C] | null {
  try {
    const record = _pick(contract, opts, /*required*/ false);
    return record.impl;
  } catch {
    return null;
  }
}

/**
 * Alias explícito de `resolve` — comunica intent claramente.
 */
export function required<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
): ServiceContractMap[C] {
  return resolve(contract, opts);
}

/**
 * Metadata (record) do resolve — útil pra Diagnostics/UI. Não expõe impl.
 */
export function describe<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
): Omit<ServiceRecord<C>, "impl"> | null {
  try {
    const rec = _pick(contract, opts, false);
    const { impl: _impl, ...rest } = rec;
    return rest;
  } catch {
    return null;
  }
}

function _pick<C extends ServiceContractId>(
  contract: C,
  opts: ResolveOptions,
  requiredFlag: boolean,
): ServiceRecord<C> {
  const t0 = performance.now();
  const candidates = serviceRegistry.findByContract(contract);
  if (candidates.length === 0) {
    const detail = `no provider for ${contract}`;
    recordMeshEvent({
      kind: requiredFlag ? "consumer.required-failed" : "consumer.optional-missed",
      pluginId: opts.consumerId,
      contract,
      detail,
    });
    throw new Error(detail);
  }
  const pick = selectBest(candidates, opts);
  if (!pick) {
    const detail = `no compatible provider for ${contract}${opts.version ? ` (${opts.version})` : ""}`;
    recordMeshEvent({
      kind: requiredFlag ? "consumer.required-failed" : "version.incompatible",
      pluginId: opts.consumerId,
      contract,
      detail,
    });
    throw new Error(detail);
  }
  const cap = checkCapabilities(opts.consumerId, pick.requiresCapabilities);
  if (!cap.granted) {
    const detail = `capabilities denied: ${cap.missing.join(", ")}`;
    recordMeshEvent({
      kind: "capability.denied",
      pluginId: opts.consumerId,
      serviceId: pick.id,
      contract,
      detail,
    });
    throw new Error(detail);
  }
  serviceRegistry.incrementResolve(pick.id);
  recordMeshEvent({
    kind: "consumer.resolved",
    pluginId: opts.consumerId,
    serviceId: pick.id,
    contract,
    durationMs: performance.now() - t0,
  });
  return pick;
}
