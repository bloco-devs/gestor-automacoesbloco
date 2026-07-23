/**
 * Capability + Version resolver. Puro. Sem side-effects.
 */
import { platformPermissions } from "../../permissions/permissions";
import type { PermissionsAPI } from "../../types";

export interface CapabilityCheck {
  granted: boolean;
  missing: string[];
}

export function checkCapabilities(
  consumerPluginId: string,
  required: string[] | undefined,
  perms: PermissionsAPI = platformPermissions,
): CapabilityCheck {
  if (!required || required.length === 0) return { granted: true, missing: [] };
  const missing = required.filter((cap) => !perms.can(consumerPluginId, cap));
  return { granted: missing.length === 0, missing };
}

/* Semver (subset) — igual estratégia do dependency-resolver. */
function parse(v: string): [number, number, number] {
  const [a, b, c] = v.replace(/^[\^~>=<]+/, "").split(".").map((n) => Number(n) || 0);
  return [a, b, c];
}

export function versionSatisfies(actual: string, required?: string): boolean {
  if (!required) return true;
  const [a1, a2, a3] = parse(actual);
  const [r1, r2, r3] = parse(required);
  if (required.startsWith("^")) return a1 === r1 && (a2 > r2 || (a2 === r2 && a3 >= r3));
  if (required.startsWith("~")) return a1 === r1 && a2 === r2 && a3 >= r3;
  if (required.startsWith(">=")) {
    if (a1 !== r1) return a1 > r1;
    if (a2 !== r2) return a2 > r2;
    return a3 >= r3;
  }
  return a1 === r1 && a2 === r2 && a3 === r3;
}
