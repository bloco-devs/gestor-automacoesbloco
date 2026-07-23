/**
 * Manifest Validator (Extension Host).
 * Reaproveita `validateManifest` do runtime e adiciona checagens
 * específicas do Package: sdkVersion, hostVersion, publisher, keywords.
 * Nunca lança.
 */
import type { PluginPackage } from "../repository/types";
import { validateManifest, type ValidationResult } from "../runtime/validator";
import { parseVersion } from "../versioning";

export interface ExtendedValidationResult extends ValidationResult {
  packageErrors: string[];
  packageWarnings: string[];
}

export function validatePackage(pkg: PluginPackage): ExtendedValidationResult {
  const base = validateManifest(pkg.manifest);
  const packageErrors: string[] = [];
  const packageWarnings: string[] = [];

  if (pkg.id !== pkg.manifest.id) {
    packageErrors.push(
      `Package.id (${pkg.id}) diverge de manifest.id (${pkg.manifest.id})`
    );
  }
  if (pkg.version !== pkg.manifest.version) {
    packageErrors.push(
      `Package.version (${pkg.version}) diverge de manifest.version (${pkg.manifest.version})`
    );
  }

  const meta = pkg.metadata ?? {};
  if (meta.sdkVersion && !parseVersion(meta.sdkVersion.replace(/^[\^~>=<]+/, ""))) {
    packageWarnings.push(`sdkVersion não parseável: ${meta.sdkVersion}`);
  }
  if (meta.hostVersion && !parseVersion(meta.hostVersion.replace(/^[\^~>=<]+/, ""))) {
    packageWarnings.push(`hostVersion não parseável: ${meta.hostVersion}`);
  }
  if (!pkg.signature) {
    packageWarnings.push("Pacote sem assinatura");
  }

  return {
    ...base,
    valid: base.valid && packageErrors.length === 0,
    errors: [...base.errors, ...packageErrors],
    warnings: [...base.warnings, ...packageWarnings],
    packageErrors,
    packageWarnings,
  };
}

export { validateManifest } from "../runtime/validator";
export type { ValidationResult } from "../runtime/validator";
