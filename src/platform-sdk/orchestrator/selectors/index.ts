/**
 * Default Agent/Skill/Tool selectors — decisões desacopladas do Copilot.
 */
import type { AiAgent, AiSkill, AiTool, AiInvocationContext } from "../../ai-sdk/types";
import type { ExecutionPolicy, OrchestratorSelector } from "../types";

function healthScore(h?: () => "ok" | "degraded" | "down"): number {
  if (!h) return 0.5;
  try {
    const v = h();
    return v === "ok" ? 1 : v === "degraded" ? 0.5 : 0;
  } catch {
    return 0.5;
  }
}

export function defaultSelectAgent(
  ctx: AiInvocationContext,
  policy: ExecutionPolicy,
  agents: AiAgent[],
  custom: OrchestratorSelector[] = []
): AiAgent | undefined {
  for (const s of custom.slice().sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    const r = s.selectAgent?.(ctx, policy, agents);
    if (r) return r;
  }
  const scored = agents
    .map((a) => {
      const pol = a.routingPolicy;
      let score = 0;
      if (pol?.modules && ctx.module && pol.modules.includes(ctx.module)) score += 100;
      if (pol?.priority !== undefined) score += 100 - pol.priority;
      if (policy.preferHealth) score += 50 * healthScore(a.health);
      return { a, score };
    })
    .filter(({ a }) => {
      const pol = a.routingPolicy;
      if (!pol?.modules) return true;
      if (!ctx.module) return true;
      return pol.modules.includes(ctx.module);
    })
    .sort((x, y) => y.score - x.score);
  return scored[0]?.a;
}

export function defaultSelectSkills(
  ctx: AiInvocationContext,
  policy: ExecutionPolicy,
  skills: AiSkill[],
  custom: OrchestratorSelector[] = []
): AiSkill[] {
  for (const s of custom.slice().sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    const r = s.selectSkills?.(ctx, policy, skills);
    if (r?.length) return r.slice(0, policy.maxSkills ?? r.length);
  }
  const filtered = skills.filter((s) => s.enabled !== false);
  const scored = filtered
    .map((s) => {
      let score = 1;
      if (policy.preferHealth) score += healthScore(s.health);
      if (s.contextRequirements?.some((r) => r === "module") && ctx.module) score += 1;
      return { s, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, policy.maxSkills ?? scored.length).map((x) => x.s);
}

export function defaultSelectTools(
  ctx: AiInvocationContext,
  policy: ExecutionPolicy,
  tools: AiTool[],
  agent: AiAgent | undefined,
  custom: OrchestratorSelector[] = []
): AiTool[] {
  for (const s of custom.slice().sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    const r = s.selectTools?.(ctx, policy, tools);
    if (r?.length) return r.slice(0, policy.maxTools ?? r.length);
  }
  const wanted = new Set(agent?.toolIds ?? []);
  const pool = wanted.size > 0 ? tools.filter((t) => wanted.has(t.id)) : tools;
  const scored = pool
    .map((t) => ({ t, score: healthScore(t.health) }))
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, policy.maxTools ?? scored.length).map((x) => x.t);
}
