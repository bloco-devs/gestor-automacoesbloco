/**
 * Planner — decide plano completo a partir do contexto + policy.
 */
import type {
  AiAgent,
  AiInvocationContext,
  AiMemoryProvider,
  AiPrompt,
  AiSkill,
  AiTool,
} from "../../ai-sdk/types";
import { aiExtensionRegistry } from "../../ai-sdk/registry";
import { findPromptBySlot } from "../../ai-sdk/prompts";
import type {
  ExecutionPlan,
  ExecutionPolicy,
  OrchestratorPlanner,
  OrchestratorSelector,
  PlannerContext,
} from "../types";
import {
  defaultSelectAgent,
  defaultSelectSkills,
  defaultSelectTools,
} from "../selectors";
import { buildDefaultPipeline } from "../pipeline";

let planCounter = 0;

function newPlanId(): string {
  planCounter += 1;
  return `plan_${Date.now()}_${planCounter}`;
}

function inferSlot(ctx: AiInvocationContext): string | undefined {
  if (ctx.module) return `copilot.${ctx.module}`;
  if (ctx.route) return `route:${ctx.route}`;
  return undefined;
}

export function buildDefaultPlan(
  planCtx: PlannerContext,
  customSelectors: OrchestratorSelector[] = []
): ExecutionPlan {
  const { ctx, policy } = planCtx;

  const agents: AiAgent[] = aiExtensionRegistry.agents();
  const skills: AiSkill[] = aiExtensionRegistry.skills();
  const tools: AiTool[] = aiExtensionRegistry.tools();
  const memories: AiMemoryProvider[] = aiExtensionRegistry.memory();

  const agent = defaultSelectAgent(ctx, policy, agents, customSelectors);
  const selectedSkills = defaultSelectSkills(ctx, policy, skills, customSelectors);
  const selectedTools = defaultSelectTools(ctx, policy, tools, agent, customSelectors);

  const slot = agent?.promptSlot ?? inferSlot(ctx);
  const prompt: AiPrompt | undefined = slot ? findPromptBySlot(slot, ctx) : undefined;

  const memory = agent?.memoryId
    ? memories.find((m) => m.id === agent.memoryId)
    : memories[0];

  const pipeline = buildDefaultPipeline({
    agent,
    skills: selectedSkills,
    tools: selectedTools,
    prompt,
    memory,
    policy,
  });

  const estimatedCost =
    (selectedSkills.length + selectedTools.length + (agent ? 1 : 0)) *
    (policy.costMultiplier ?? 1);

  const confidence =
    (agent ? 0.4 : 0) +
    Math.min(0.4, selectedSkills.length * 0.15) +
    (prompt ? 0.2 : 0);

  const priority = agent?.routingPolicy?.priority ?? 100;

  return {
    id: newPlanId(),
    createdAt: Date.now(),
    policy: policy.id,
    agent,
    skills: selectedSkills,
    tools: selectedTools,
    memory,
    prompt,
    pipeline,
    priority,
    estimatedCost,
    confidence,
    reason:
      confidence < (policy.minConfidence ?? 0)
        ? "confidence-below-threshold"
        : "default-planner",
    warnings:
      confidence < (policy.minConfidence ?? 0)
        ? [`confidence ${confidence.toFixed(2)} < min ${(policy.minConfidence ?? 0).toFixed(2)}`]
        : [],
  };
}

export function runPlanners(
  planCtx: PlannerContext,
  planners: OrchestratorPlanner[],
  selectors: OrchestratorSelector[]
): ExecutionPlan {
  const sorted = planners.slice().sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  for (const p of sorted) {
    try {
      const r = p.plan(planCtx);
      if (r) return r;
    } catch {
      /* ignore */
    }
  }
  return buildDefaultPlan(planCtx, selectors);
}

export function definePlanner(p: Omit<OrchestratorPlanner, "kind">): OrchestratorPlanner {
  return { kind: "planner", ...p };
}
export function defineSelector(s: Omit<OrchestratorSelector, "kind">): OrchestratorSelector {
  return { kind: "selector", ...s };
}
export function definePipeline(p: Omit<import("../types").OrchestratorPipeline, "kind">): import("../types").OrchestratorPipeline {
  return { kind: "pipeline", ...p };
}
export function definePolicy(p: Omit<ExecutionPolicy, "kind">): ExecutionPolicy {
  return { kind: "policy", ...p };
}
