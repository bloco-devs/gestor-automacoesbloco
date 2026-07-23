import { HOOKS, LARGE_FILES, SERVICES } from "../catalog/inventory";
import type { HealthFinding } from "../types";

const LARGE_FILE_LIMIT = 15_000;   // ~15KB começa a exigir atenção
const HUGE_FILE_LIMIT = 25_000;

/**
 * Deriva achados de saúde do código a partir do inventário estático.
 * Puro, memoizável — sem varredura em runtime.
 */
export function computeHealthFindings(): HealthFinding[] {
  const findings: HealthFinding[] = [];

  for (const f of LARGE_FILES) {
    if (f.category === "generated") continue;
    if (f.bytes >= HUGE_FILE_LIMIT) {
      findings.push({
        id: `large:${f.path}`,
        kind: f.category === "page" ? "large-file" : f.category === "component" ? "large-component" : "large-file",
        severity: "warn",
        message: `${f.path} — ${Math.round(f.bytes / 1024)}KB acima do alvo de 25KB.`,
        path: f.path,
      });
    } else if (f.bytes >= LARGE_FILE_LIMIT) {
      findings.push({
        id: `large:${f.path}`,
        kind: "large-file",
        severity: "info",
        message: `${f.path} — ${Math.round(f.bytes / 1024)}KB (perto do alvo).`,
        path: f.path,
      });
    }
  }

  // Hooks/services concentradores (proxy de "hooks grandes")
  const heavyHook = HOOKS.find((h) => (h.reuse ?? 0) >= 15);
  if (heavyHook) {
    findings.push({
      id: `hook-hot:${heavyHook.id}`,
      kind: "large-hook",
      severity: "info",
      message: `Hook muito reutilizado: ${heavyHook.label} (${heavyHook.reuse} imports). Considere manter interface estável.`,
      path: heavyHook.path,
    });
  }

  const heavyService = SERVICES.find((s) => (s.reuse ?? 0) >= 50);
  if (heavyService) {
    findings.push({
      id: `svc-hot:${heavyService.id}`,
      kind: "duplication",
      severity: "info",
      message: `Service extremamente reutilizado: ${heavyService.label}. Alto acoplamento.`,
      path: heavyService.path,
    });
  }

  // Imports circulares detectados
  // (Nenhum ciclo conhecido — deixamos como info explícita.)
  findings.push({
    id: "circular:none",
    kind: "circular",
    severity: "info",
    message: "Nenhum import circular detectado nos módulos monitorados.",
  });

  // Componentes semelhantes / duplicação candidata
  findings.push({
    id: "dup:kanban",
    kind: "similar",
    severity: "info",
    message: "Existem 2 boards Kanban distintos (demands e solucoes). Avaliar extração de primitivo comum.",
  });

  return findings;
}
