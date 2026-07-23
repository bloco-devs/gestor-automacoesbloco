/**
 * Repository Diagnostics — inspeção completa de packages entre
 * todos os repositórios registrados. Puro, sem side-effects.
 */
import type { PluginRepositoryRegistry } from "../repository";
import type {
  PluginPackage,
  RepositoryDiagnosticsEntry,
} from "../repository/types";
import { validatePackage } from "../manifest";
import { verifyManifestSignature } from "../signature";
import {
  checkHostCompatibility,
  SDK_VERSION,
  HOST_VERSION,
} from "../versioning";

export interface RepositoryDiagnosticsReport {
  generatedAt: number;
  totalRepositories: number;
  totalPackages: number;
  entries: RepositoryDiagnosticsEntry[];
  summary: {
    valid: number;
    invalid: number;
    signed: number;
    trusted: number;
    incompatible: number;
  };
}

export async function diagnoseRepositories(
  registry: PluginRepositoryRegistry
): Promise<RepositoryDiagnosticsReport> {
  const repos = registry.list();
  const entries: RepositoryDiagnosticsEntry[] = [];
  let valid = 0;
  let invalid = 0;
  let signed = 0;
  let trusted = 0;
  let incompatible = 0;

  for (const repo of repos) {
    let list: PluginPackage[] = [];
    try {
      list = await repo.list();
    } catch {
      list = [];
    }
    for (const pkg of list) {
      const validation = validatePackage(pkg);
      const { integrity, verified } = await verifyManifestSignature(
        pkg.manifest,
        pkg.signature
      );
      const compat = checkHostCompatibility({
        sdkCurrent: SDK_VERSION,
        hostCurrent: HOST_VERSION,
        sdkRequired: pkg.metadata?.sdkVersion,
        hostRequired: pkg.metadata?.hostVersion,
      });

      if (validation.valid) valid++;
      else invalid++;
      if (pkg.signature?.hash) signed++;
      if (pkg.signature?.trusted && verified) trusted++;
      if (!compat.ok) incompatible++;

      entries.push({
        repository: repo.id,
        kind: repo.kind,
        packageId: pkg.id,
        version: pkg.version,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        signature: { ...pkg.signature, verified },
        integrity,
        compatibility: compat,
      });
    }
  }

  return {
    generatedAt: Date.now(),
    totalRepositories: repos.length,
    totalPackages: entries.length,
    entries,
    summary: { valid, invalid, signed, trusted, incompatible },
  };
}
