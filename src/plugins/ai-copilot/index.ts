/**
 * AI Copilot Plugin — public entry.
 * PLUGIN 001.
 */
export { default, AICopilotPlugin } from "./manifest";
export * from "./types";
export { routePrompt, ALL_PROMPTS } from "./prompts";
export { COPILOT_ACTIONS, actionsFor } from "./actions";
export {
  emitCopilotEvent,
  onCopilotEvent,
  copilotEventHistory,
  subscribeCopilotEvents,
} from "./events";
export {
  appendMessage,
  listMessages,
  clearMemory,
  subscribeMemory,
} from "./memory";
export {
  listDiagnostics,
  subscribeDiagnostics,
} from "./utils/diagnostics";
export {
  useCopilotMessages,
  useCopilotEvents,
  useCopilotDiagnostics,
} from "./hooks/useCopilot";
export {
  readCopilotContext,
  summarizeCopilotContext,
} from "./context/provider";
export { copilotCommands } from "./commands";
export {
  resolveCopilotServices,
  fetchRelatedKnowledge,
  copilotMeshSnapshot,
} from "./services/mesh-consumer";
