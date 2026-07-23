/**
 * AI SDK — public entry.
 */
export * from "./types";
export {
  aiExtensionRegistry,
  AiExtensionRegistry,
  type AiRegistryDiagnostics,
} from "./registry";
export { defineSkill, runSkill } from "./skills";
export {
  definePrompt,
  findPromptBySlot,
  resolveFallback,
  renderUserTemplate,
} from "./prompts";
export { defineTool, runTool } from "./tools";
export {
  defineContextBuilder,
  buildContext,
  buildScopes,
} from "./context";
export { defineAgent, runAgent, selectAgentForContext } from "./agents";
export {
  createInMemoryProvider,
  createMockProvider,
  getMemory,
} from "./memory";
export { resolveAi } from "./router";
export {
  collectAiSdkDiagnostics,
  type AiSdkDiagnostics,
  type AiHealthSample,
} from "./diagnostics";
export {
  AI_SDK_CONTRACT,
  AI_SDK_VERSION,
  aiSdkService,
  type AiSdkService,
} from "./contracts";
export {
  bootstrapAiSdkProvider,
  isAiSdkBootstrapped,
  __resetAiSdkBootstrap,
} from "./bootstrap";
export { useAiExtensions, useAiSdkDiagnostics } from "./hooks";
