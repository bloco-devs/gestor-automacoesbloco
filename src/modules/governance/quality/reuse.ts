import { DESIGN_SYSTEM, HOOKS, MODULES, SERVICES } from "../catalog/inventory";
import type { ReuseEntry } from "../types";

export function computeReuseBoard(): {
  components: ReuseEntry[];
  hooks: ReuseEntry[];
  services: ReuseEntry[];
  isolated: ReuseEntry[];
  candidates: ReuseEntry[];
} {
  const components: ReuseEntry[] = DESIGN_SYSTEM.map((c) => ({
    id: c.id,
    label: c.label,
    kind: "component" as const,
    reuseCount: c.reuse ?? 0,
    path: c.path,
  })).sort((a, b) => b.reuseCount - a.reuseCount);

  const hooks: ReuseEntry[] = HOOKS.map((h) => ({
    id: h.id,
    label: h.label,
    kind: "hook" as const,
    reuseCount: h.reuse ?? 0,
    path: h.path,
  })).sort((a, b) => b.reuseCount - a.reuseCount);

  const services: ReuseEntry[] = SERVICES.map((s) => ({
    id: s.id,
    label: s.label,
    kind: "service" as const,
    reuseCount: s.reuse ?? 0,
    path: s.path,
  })).sort((a, b) => b.reuseCount - a.reuseCount);

  const isolated: ReuseEntry[] = MODULES.filter((m) => (m.reuse ?? 0) <= 1).map((m) => ({
    id: m.id,
    label: m.label,
    kind: "module" as const,
    reuseCount: m.reuse ?? 0,
    path: m.path,
  }));

  // Candidatos para extração: hooks/services de reuso baixo mas usados em >1 módulo
  const candidates: ReuseEntry[] = [...hooks, ...services].filter(
    (r) => r.reuseCount >= 2 && r.reuseCount <= 4,
  );

  return { components, hooks, services, isolated, candidates };
}
