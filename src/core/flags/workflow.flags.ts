import { registerFlags } from "./registry";

export const WORKFLOW_FLAGS = {
  runnerV2: "automations.runner.v2",
  compensation: "workflow.compensation",
  circuitBreaker: "workflow.circuit_breaker",
} as const;

registerFlags([
  { key: WORKFLOW_FLAGS.runnerV2, category: "workflow", description: "Runner v2 com actions plugin", defaultValue: false },
  { key: WORKFLOW_FLAGS.compensation, category: "workflow", description: "Rollback/compensação em falhas", defaultValue: false },
  { key: WORKFLOW_FLAGS.circuitBreaker, category: "workflow", description: "Circuit breaker por destino externo", defaultValue: false },
]);
