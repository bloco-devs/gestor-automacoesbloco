/**
 * Extension Loader — fluxo canônico:
 *   Repository → Package → Validator → Signature → Compatibility
 *              → Dependency Resolver → Host → Runtime
 *
 * O Loader é INDEPENDENTE do PluginHost — ele apenas prepara
 * os manifests e diagnósticos, e opcionalmente chama `host.initialize`.
 * Nunca lança.
 */
import type { PluginManifest } from "../types";
import type { PluginPackage } from "../repository/types";
import type { PluginRepositoryRegistry } from "../repository";
import { validatePackage, type ExtendedValidationResult } from "../manifest";
import { verifyManifestSignature } from "../signature";
import {
  checkHostCompatibility,
  SDK_VERSION,
  HOST_VERSION,
} from "../versioning";
import { pluginHost } from "../runtime";
import type { HostDiagnostics } from "../runtime/host";

export interface LoaderEntry {
  repository: string;
  package: PluginPackage;
  validation: ExtendedValidationResult;
  signature: {
    verified: boolean;
    integrity: "ok" | "hash-mismatch" | "unsigned";
    trusted: boolean;
    fingerprint: string;
  };
  compatibility: {
    ok: boolean;
    sdkOk: boolean;
    hostOk: boolean;
    reasons: string[];
  };
  admissible: boolean;
  rejectionReason?: string;
}

export interface LoaderReport {
  startedAt: number;
  durationMs: number;
  entries: LoaderEntry[];
  admittedManifests: PluginManifest[];
  rejected: LoaderEntry[];
}

export async function loadFromRepositories(
  registry: PluginRepositoryRegistry
): Promise<LoaderReport> {
  const startedAt = Date.now();
  const t0 = performance.now();
  const collected = await registry.collect();
  const entries: LoaderEntry[] = [];
  const admitted: PluginManifest[] = [];
  const rejected: LoaderEntry[] = [];

  for (const { repository, pkg } of collected) {
    const validation = validatePackage(pkg);
    const sig = await verifyManifestSignature(pkg.manifest, pkg.signature);
    const compat = checkHostCompatibility({
      sdkCurrent: SDK_VERSION,
      hostCurrent: HOST_VERSION,
      sdkRequired: pkg.metadata?.sdkVersion,
      hostRequired: pkg.metadata?.hostVersion,
    });

    const admissible = validation.valid && compat.ok && sig.integrity !== "hash-mismatch";
    let rejectionReason: string | undefined;
    if (!validation.valid) rejectionReason = `Manifest inválido: ${validation.errors.join("; ")}`;
    else if (!compat.ok) rejectionReason = `Incompatível: ${compat.reasons.join("; ")}`;
    else if (sig.integrity === "hash-mismatch") rejectionReason = "Assinatura inválida (hash divergente)";

    const entry: LoaderEntry = {
      repository: repository.id,
      package: pkg,
      validation,
      signature: {
        verified: sig.verified,
        integrity: sig.integrity,
        trusted: !!pkg.signature?.trusted,
        fingerprint: pkg.signature?.fingerprint ?? "",
      },
      compatibility: compat,
      admissible,
      rejectionReason,
    };
    entries.push(entry);
    if (admissible) admitted.push(pkg.manifest);
    else rejected.push(entry);
  }

  return {
    startedAt,
    durationMs: performance.now() - t0,
    entries,
    admittedManifests: admitted,
    rejected,
  };
}

/**
 * Conveniência: carrega e delega ao Host. Retorna Loader + HostDiagnostics.
 */
export async function bootExtensionHost(
  registry: PluginRepositoryRegistry
): Promise<{ loader: LoaderReport; host: HostDiagnostics }> {
  const loader = await loadFromRepositories(registry);
  const host = await pluginHost.initialize(loader.admittedManifests);
  return { loader, host };
}
