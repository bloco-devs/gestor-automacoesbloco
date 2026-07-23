/**
 * Pipeline defaults — declarative stages.
 */
import type { PipelineStepSpec, ExecutionPolicy, AiExecutionResult } from "../types";
import type { AiAgent, AiSkill, AiTool, AiPrompt, AiMemoryProvider } from "../../ai-sdk/types";

export function buildDefaultPipeline(input: {
  agent?: AiAgent;
  skills: AiSkill[];
  tools: AiTool[];
  prompt?: AiPrompt;
  memory?: AiMemoryProvider;
  policy: ExecutionPolicy;
}): PipelineStepSpec[] {
  const steps: PipelineStepSpec[] = [
    { id: "ctx", kind: "context", description: "Build invocation context" },
    { id: "plan", kind: "planner", description: "Build execution plan" },
  ];
  if (input.prompt) {
    steps.push({ id: `prompt:${input.prompt.id}`, kind: "prompt", refId: input.prompt.id });
  }
  if (input.agent) {
    steps.push({ id: `agent:${input.agent.id}`, kind: "agent", refId: input.agent.id });
  }
  const parallelGroup = input.policy.scheduling === "parallel" ? "skills" : undefined;
  for (const s of input.skills) {
    steps.push({
      id: `skill:${s.id}`,
      kind: "skill",
      refId: s.id,
      parallelGroup,
    });
  }
  for (const t of input.tools) {
    steps.push({ id: `tool:${t.id}`, kind: "tool", refId: t.id, optional: true });
  }
  if (input.memory) {
    steps.push({ id: `mem:${input.memory.id}`, kind: "memory", refId: input.memory.id });
  }
  steps.push({ id: "out", kind: "output", description: "Compose output" });
  return steps;
}

export type PipelineStepResult = AiExecutionResult;
