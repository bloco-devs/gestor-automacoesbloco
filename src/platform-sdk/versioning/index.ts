/**
 * Versioning — comparador semver enxuto (PLUGIN 004).
 * Suporta: "1.2.3", ">=1.2.3", ">1.2.3", "<=1.2.3", "<1.2.3", "^1.2.3", "~1.2.3".
 * Não é uma implementação completa de semver — é suficiente para gates
 * de SDK/Host e dependências do host runtime.
 */

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  pre?: string;
}

const RE = /^(\d+)\.(\d+)\.(\d+)(?:-([\w.]+))?$/;

export function parseVersion(v: string): ParsedVersion | null {
  const m = RE.exec(v.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4],
  };
}

/** -1 | 0 | 1 comparando A vs B. Retorna null se algum lado for inválido. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return null;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  if (pa.pre === pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;
  return pa.pre < pb.pre ? -1 : 1;
}

/** Testa se `current` satisfaz `range`. Se range for undefined, aceita. */
export function satisfies(current: string, range?: string): boolean {
  if (!range) return true;
  const r = range.trim();
  const parsedCurrent = parseVersion(current);
  if (!parsedCurrent) return false;

  const op = /^(>=|<=|>|<|\^|~|=)?/.exec(r)?.[1] ?? "";
  const raw = r.slice(op.length).trim();
  const target = parseVersion(raw);
  if (!target) return false;
  const cmp = compareVersions(current, raw);
  if (cmp === null) return false;

  switch (op) {
    case ">":
      return cmp === 1;
    case ">=":
      return cmp !== -1;
    case "<":
      return cmp === -1;
    case "<=":
      return cmp !== 1;
    case "^":
      // ^1.2.3 → >=1.2.3 <2.0.0
      return (
        parsedCurrent.major === target.major && cmp !== -1
      );
    case "~":
      // ~1.2.3 → >=1.2.3 <1.3.0
      return (
        parsedCurrent.major === target.major &&
        parsedCurrent.minor === target.minor &&
        cmp !== -1
      );
    case "":
    case "=":
    default:
      return cmp === 0;
  }
}

export interface CompatibilityInput {
  sdkCurrent: string;
  hostCurrent: string;
  sdkRequired?: string;
  hostRequired?: string;
}

export interface CompatibilityOutcome {
  ok: boolean;
  sdkOk: boolean;
  hostOk: boolean;
  reasons: string[];
}

export function checkHostCompatibility(input: CompatibilityInput): CompatibilityOutcome {
  const sdkOk = satisfies(input.sdkCurrent, input.sdkRequired);
  const hostOk = satisfies(input.hostCurrent, input.hostRequired);
  const reasons: string[] = [];
  if (!sdkOk)
    reasons.push(
      `SDK ${input.sdkRequired ?? "?"} requerido; atual ${input.sdkCurrent}`
    );
  if (!hostOk)
    reasons.push(
      `Host ${input.hostRequired ?? "?"} requerido; atual ${input.hostCurrent}`
    );
  return { ok: sdkOk && hostOk, sdkOk, hostOk, reasons };
}

/** Constantes públicas — sincronizadas com o Marketplace legacy. */
export const SDK_VERSION = "1.0.0";
export const HOST_VERSION = "1.0.0";
