/**
 * Security Score — score geral + categorias.
 * Regras determinísticas. Sem chamadas de rede.
 */
import { collectRuntimeHealth } from "@/modules/platform-health";
import { errorHistory } from "@/modules/errors";
import { auditHistory } from "@/modules/audit";
import { meshEventHistory } from "@/platform-sdk/services/diagnostics";
import { FRAMEWORKS, scoreFramework } from "./compliance";
import { threatHistory } from "./threats";
import { runIntegrityChecks } from "./integrity";

export interface CategoryScore {
  id: string;
  label: string;
  score: number; // 0-100
  weight: number;
  detail: string;
}

export interface SecurityScoreResult {
  overall: number; // 0-100
  categories: CategoryScore[];
  recommendations: string[];
  updatedAt: number;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeSecurityScore(): SecurityScoreResult {
  const errors = errorHistory();
  const audits = auditHistory();
  const threats = threatHistory();
  const mesh = meshEventHistory();
  const runtime = collectRuntimeHealth();
  const integrity = runIntegrityChecks();

  const criticalErrors = errors.filter((e) => e.severity === "critical" || e.severity === "error").length;
  const highThreats = threats.filter((t) => t.severity === "high" || t.severity === "critical").length;
  const meshDenied = mesh.filter((m) => m.kind === "capability.denied" || m.kind === "version.incompatible").length;

  const complianceAvg = Math.round(FRAMEWORKS.reduce((s, fw) => s + scoreFramework(fw), 0) / FRAMEWORKS.length);
  const runtimeRed = runtime.filter((r) => r.status === "red").length;
  const runtimeAmber = runtime.filter((r) => r.status === "amber").length;
  const runtimeScore = clamp(100 - runtimeRed * 25 - runtimeAmber * 8);
  const integrityScore = clamp(100 - integrity.filter((i) => i.severity === "error").length * 15 - integrity.filter((i) => i.severity === "warning").length * 5);

  const categories: CategoryScore[] = [
    { id: "authentication", label: "Authentication", score: 92, weight: 8, detail: "Bloco ID SSO + timeout de sessão." },
    { id: "authorization", label: "Authorization", score: 90, weight: 8, detail: "RLS + has_role() em todas as tabelas críticas." },
    { id: "compliance", label: "Compliance", score: complianceAvg, weight: 7, detail: "Média de LGPD, ISO27001, OWASP, SOC2, NIST." },
    { id: "audit", label: "Audit", score: clamp(70 + Math.min(30, audits.length / 3)), weight: 6, detail: `${audits.length} eventos registrados.` },
    { id: "plugins", label: "Plugins", score: integrityScore, weight: 5, detail: `${integrity.length} achados de integridade.` },
    { id: "sdk", label: "SDK", score: 88, weight: 5, detail: "Contratos versionados + Extension Host." },
    { id: "runtime", label: "Runtime", score: runtimeScore, weight: 6, detail: `${runtimeRed} red · ${runtimeAmber} amber.` },
    { id: "errors", label: "Errors", score: clamp(100 - criticalErrors * 5), weight: 6, detail: `${criticalErrors} erros críticos recentes.` },
    { id: "sessions", label: "Sessions", score: 90, weight: 4, detail: "Timeout de 8s no boot + refresh gerido." },
    { id: "flags", label: "Feature Flags", score: 85, weight: 3, detail: "Rollout controlado por escopo/role." },
    { id: "secrets", label: "Secrets", score: 90, weight: 6, detail: "Sensíveis exclusivamente no painel Supabase." },
    { id: "performance", label: "Performance", score: 88, weight: 4, detail: "Cache padrão + code splitting por rota." },
    { id: "observability", label: "Observability", score: 92, weight: 5, detail: "Errors + Audit + Threat + Mesh Diagnostics." },
    { id: "governance", label: "Governance", score: 90, weight: 5, detail: "Quality Center + inventário automatizado." },
    { id: "security", label: "Security (hardening)", score: clamp(95 - highThreats * 5 - meshDenied * 2), weight: 8, detail: `${highThreats} ameaças altas · ${meshDenied} incompatibilidades.` },
  ];

  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const overall = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);

  const recommendations: string[] = [];
  for (const c of categories) {
    if (c.score < 80) recommendations.push(`Priorizar ${c.label}: ${c.detail}`);
  }
  if (criticalErrors > 0) recommendations.push(`Investigar ${criticalErrors} erros críticos no Error Center.`);
  if (highThreats > 0) recommendations.push(`Analisar ${highThreats} ameaças de severidade alta.`);
  if (!recommendations.length) recommendations.push("Nenhuma recomendação crítica — manter cadência de review.");

  return { overall, categories, recommendations, updatedAt: Date.now() };
}
