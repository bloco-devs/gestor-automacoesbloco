import type { PluginManifest, ExtensionPointId } from "../../types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_SLOTS: ExtensionPointId[] = [
  "sidebar",
  "dashboard",
  "workspace",
  "portal",
  "operations",
  "analytics",
  "admin",
  "commandPalette",
  "contextPanel",
  "copilot",
];

const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const ID_RE = /^[a-z0-9][a-z0-9-_.]*$/i;

/**
 * Manifest Validator — nunca lança. Retorna diagnóstico.
 * Plugins inválidos são marcados como "rejected" pelo Host.
 */
export function validateManifest(m: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!m || typeof m !== "object") {
    return { valid: false, errors: ["Manifest is not an object"], warnings };
  }
  const manifest = m as Partial<PluginManifest>;

  if (!manifest.id || typeof manifest.id !== "string") errors.push("Missing id");
  else if (!ID_RE.test(manifest.id)) errors.push(`Invalid id: ${manifest.id}`);

  if (!manifest.name || typeof manifest.name !== "string") errors.push("Missing name");

  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("Missing version");
  } else if (!SEMVER_RE.test(manifest.version)) {
    warnings.push(`Non-semver version: ${manifest.version}`);
  }

  if (!manifest.category) errors.push("Missing category");

  if (manifest.dependencies) {
    if (!Array.isArray(manifest.dependencies)) errors.push("dependencies must be array");
    else {
      manifest.dependencies.forEach((d, i) => {
        if (!d?.pluginId) errors.push(`dependencies[${i}].pluginId missing`);
      });
    }
  }

  if (manifest.commands) {
    if (!Array.isArray(manifest.commands)) errors.push("commands must be array");
    else {
      manifest.commands.forEach((c, i) => {
        if (!c?.id) errors.push(`commands[${i}].id missing`);
        if (!c?.title) errors.push(`commands[${i}].title missing`);
        if (typeof c?.run !== "function") errors.push(`commands[${i}].run must be function`);
      });
    }
  }

  if (manifest.widgets) {
    if (!Array.isArray(manifest.widgets)) errors.push("widgets must be array");
    else {
      manifest.widgets.forEach((w, i) => {
        if (!w?.id) errors.push(`widgets[${i}].id missing`);
        if (!w?.slot) errors.push(`widgets[${i}].slot missing`);
        else if (!VALID_SLOTS.includes(w.slot))
          errors.push(`widgets[${i}].slot invalid: ${w.slot}`);
        if (typeof w?.render !== "function")
          errors.push(`widgets[${i}].render must be function`);
      });
    }
  }

  if (manifest.permissions) {
    const { requires, provides } = manifest.permissions;
    if (requires && !Array.isArray(requires)) errors.push("permissions.requires must be array");
    if (provides && !Array.isArray(provides)) errors.push("permissions.provides must be array");
  }

  return { valid: errors.length === 0, errors, warnings };
}
