/**
 * FEATURE 026 — Enterprise Dashboard (Onda 10).
 * Todos os scores derivam de métricas existentes. 0–100.
 */
import { collectRuntimeHealth } from "@/modules/platform-health";
import { computeSecurityScore } from "@/modules/security";
import { errorHistory } from "@/modules/errors";
import {
  collectObservabilityOverview,
  collectPluginMonitor,
  collectAiRuntime,
  collectWorkflowRuntime,
} from "./aggregators";

export interface EnterpriseScore {
  id:
    | "platform"
    | "security"
    | "quality"
    | "production"
    | "health"
    | "plugin"
    | "ai"
    | "workflow"
    | "observability";
  label: string;
  score: number;
  detail: string;
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeEnterpriseScores(): EnterpriseScore[] {
  const overview = collectObservabilityOverview();
  const health = collectRuntimeHealth();
  const plugins = collectPluginMonitor();
  const ai = collectAiRuntime();
  const wf = collectWorkflowRuntime();
  const errs = errorHistory();

  const healthScore = clamp(
    health.length ? (health.filter((h) => h.status === "green").length / health.length) * 100 : 100,
  );
  const pluginScore = clamp(
    plugins.length ? (1 - plugins.filter((p) => p.status === "error").length / plugins.length) * 100 : 100,
  );
  const errorPenalty = Math.min(60, errs.filter((e) => e.severity === "error" || e.severity === "critical").length * 4);
  const productionScore = clamp(100 - errorPenalty);
  const aiScore = clamp(Math.min(100, (ai.skills + ai.agents + ai.tools) * 4 + (ai.chains ? 30 : 0)));
  const wfScore = clamp(Math.min(100, (wf.actions + wf.triggers + wf.conditions + wf.validators) * 6));
  const observabilityScore = clamp(
    (overview.traces ? 40 : 0) + (overview.meshEvents ? 30 : 0) + (overview.errors >= 0 ? 30 : 0),
  );
  const security = computeSecurityScore();
  const securityScore = clamp(security.overall ?? 0);
  const platformScore = clamp(
    (healthScore + pluginScore + productionScore + aiScore + wfScore + observabilityScore + securityScore) / 7,
  );
  const qualityScore = clamp((platformScore + productionScore + healthScore) / 3);

  return [
    { id: "platform", label: "Platform Score", score: platformScore, detail: "Média dos motores." },
    { id: "security", label: "Security Score", score: securityScore, detail: "Postura de segurança." },
    { id: "quality", label: "Quality Score", score: qualityScore, detail: "Estabilidade + Saúde." },
    { id: "production", label: "Production Score", score: productionScore, detail: `Erros críticos: ${errs.length}` },
    { id: "health", label: "Health Score", score: healthScore, detail: `${health.length} runtimes` },
    { id: "plugin", label: "Plugin Score", score: pluginScore, detail: `${plugins.length} plugins` },
    { id: "ai", label: "AI Score", score: aiScore, detail: `${ai.skills} skills · ${ai.agents} agents` },
    { id: "workflow", label: "Workflow Score", score: wfScore, detail: `${wf.total} extensões` },
    { id: "observability", label: "Observability Score", score: observabilityScore, detail: `${overview.traces} traces` },
  ];
}
