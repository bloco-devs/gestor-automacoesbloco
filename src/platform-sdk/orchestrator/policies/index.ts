/**
 * Execution Policies — presets oficiais + APIs de registro.
 */
import type { ExecutionPolicy, PolicyId } from "../types";

const CORE = "platform.core.orchestrator";

export const DEFAULT_POLICIES: ExecutionPolicy[] = [
  {
    kind: "policy",
    id: "fast",
    pluginId: CORE,
    description: "Baixa latência: um agente, poucas skills, sem paralelismo custoso.",
    maxAgents: 1,
    maxSkills: 1,
    maxTools: 1,
    costMultiplier: 0.5,
    minConfidence: 0.2,
    scheduling: "sequential",
    preferHealth: true,
    preferHighestPriority: true,
  },
  {
    kind: "policy",
    id: "balanced",
    pluginId: CORE,
    description: "Padrão: equilíbrio custo/qualidade.",
    maxAgents: 1,
    maxSkills: 3,
    maxTools: 3,
    costMultiplier: 1,
    minConfidence: 0.3,
    scheduling: "pipeline",
    preferHealth: true,
    preferHighestPriority: true,
  },
  {
    kind: "policy",
    id: "quality",
    pluginId: CORE,
    description: "Máxima qualidade: fan-out de skills, mais tools.",
    maxAgents: 2,
    maxSkills: 5,
    maxTools: 5,
    costMultiplier: 2,
    minConfidence: 0.5,
    scheduling: "parallel",
    preferHealth: true,
    preferHighestPriority: false,
  },
  {
    kind: "policy",
    id: "developer",
    pluginId: CORE,
    description: "Desenvolvedor: expõe TUDO, ignora health, força pipeline.",
    maxAgents: 5,
    maxSkills: 10,
    maxTools: 10,
    costMultiplier: 3,
    minConfidence: 0,
    scheduling: "pipeline",
    preferHealth: false,
    preferHighestPriority: false,
  },
  {
    kind: "policy",
    id: "economy",
    pluginId: CORE,
    description: "Menor custo: uma skill, sem tools.",
    maxAgents: 1,
    maxSkills: 1,
    maxTools: 0,
    costMultiplier: 0.25,
    minConfidence: 0.1,
    scheduling: "sequential",
    preferHealth: true,
    preferHighestPriority: true,
  },
];

export function resolvePolicy(
  id: PolicyId | undefined,
  registered: ExecutionPolicy[]
): ExecutionPolicy {
  const all = [...registered, ...DEFAULT_POLICIES];
  return all.find((p) => p.id === id) ?? all.find((p) => p.id === "balanced")!;
}
