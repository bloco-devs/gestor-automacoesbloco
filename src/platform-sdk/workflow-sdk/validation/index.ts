/**
 * Validation runner — executa todos os validators registrados
 * contra uma definição arbitrária de workflow. Nunca lança.
 */
import type { ValidatorIssue } from "../types";
import { workflowExtensionRegistry } from "../registry";

export interface ValidationReport {
  totalValidators: number;
  issues: ValidatorIssue[];
  errors: number;
  warnings: number;
  info: number;
  durationMs: number;
}

export async function runValidators(definition: unknown): Promise<ValidationReport> {
  const t0 =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const validators = workflowExtensionRegistry.validators();
  const issues: ValidatorIssue[] = [];
  for (const v of validators) {
    try {
      const out = await v.validate(definition);
      if (Array.isArray(out)) issues.push(...out);
    } catch (err) {
      issues.push({
        severity: "error",
        message: `Validator ${v.id} lançou: ${err instanceof Error ? err.message : String(err)}`,
        code: "validator.threw",
      });
    }
  }
  const durationMs =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
  return {
    totalValidators: validators.length,
    issues,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
    durationMs,
  };
}
