import { registerFlags } from "./registry";

export const AI_FLAGS = {
  cache: "ai.cache",
  fallback: "ai.fallback",
  promptRegistry: "ai.prompt_registry",
  costMonitor: "ai.cost_monitor",
  playground: "ai.playground",
} as const;

registerFlags([
  { key: AI_FLAGS.cache, category: "ai", description: "Cache de respostas por hash de payload", defaultValue: false },
  { key: AI_FLAGS.fallback, category: "ai", description: "Fallback automático entre provedores", defaultValue: false },
  { key: AI_FLAGS.promptRegistry, category: "ai", description: "Registro versionado de prompts", defaultValue: false },
  { key: AI_FLAGS.costMonitor, category: "ai", description: "Monitor de custo por prompt", defaultValue: false },
  { key: AI_FLAGS.playground, category: "ai", description: "Playground de prompts", defaultValue: false },
]);
