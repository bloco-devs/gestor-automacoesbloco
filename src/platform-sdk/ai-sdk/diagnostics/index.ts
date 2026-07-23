/**
 * Diagnostics — snapshot do AI SDK.
 */
import { aiExtensionRegistry, type AiRegistryDiagnostics } from "../registry";
import type {
  AiAgent,
  AiExtensionKind,
  AiMemoryProvider,
  AiPrompt,
  AiSkill,
  AiTool,
} from "../types";

export interface AiHealthSample {
  id: string;
  kind: AiExtensionKind;
  pluginId: string;
  health: "ok" | "degraded" | "down" | "unknown";
}

export interface AiSdkDiagnostics {
  registry: AiRegistryDiagnostics;
  health: AiHealthSample[];
  versions: Record<string, string>;
  usage: Record<string, number>;
  updatedAt: number;
}

export function collectAiSdkDiagnostics(): AiSdkDiagnostics {
  const registry = aiExtensionRegistry.diagnostics();
  const health: AiHealthSample[] = [];
  const versions: Record<string, string> = {};

  const push = (
    kind: AiExtensionKind,
    e: AiSkill | AiTool | AiAgent | AiMemoryProvider | AiPrompt
  ) => {
    let h: AiHealthSample["health"] = "unknown";
    if ("health" in e && typeof (e as { health?: unknown }).health === "function") {
      try {
        h = (e as { health: () => AiHealthSample["health"] }).health();
      } catch {
        h = "down";
      }
    } else {
      h = "ok";
    }
    health.push({ id: e.id, kind, pluginId: e.pluginId, health: h });
    if ("version" in e && e.version) versions[`${kind}:${e.id}`] = e.version;
  };

  aiExtensionRegistry.skills().forEach((s) => push("skill", s));
  aiExtensionRegistry.tools().forEach((t) => push("tool", t));
  aiExtensionRegistry.agents().forEach((a) => push("agent", a));
  aiExtensionRegistry.memory().forEach((m) => push("memory-provider", m));
  aiExtensionRegistry.prompts().forEach((p) => push("prompt", p));

  return {
    registry,
    health,
    versions,
    usage: aiExtensionRegistry.getUsage(),
    updatedAt: Date.now(),
  };
}
