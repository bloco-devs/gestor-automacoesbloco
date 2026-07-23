/**
 * AI SDK — mesh contract.
 */
import type {
  AiExtension,
  AiInvocationContext,
  AiPromptResolution,
} from "../types";
import { aiExtensionRegistry } from "../registry";
import { runSkill } from "../skills";
import { runTool } from "../tools";
import { runAgent } from "../agents";
import { buildContext, buildScopes } from "../context";
import { findPromptBySlot, renderUserTemplate } from "../prompts";
import { resolveAi } from "../router";
import { collectAiSdkDiagnostics, type AiSdkDiagnostics } from "../diagnostics";

export const AI_SDK_CONTRACT = "service.ai-sdk" as const;
export const AI_SDK_VERSION = "1.0.0";

export interface AiSdkService {
  readonly kind: "ai-sdk";
  register(ext: AiExtension): () => void;
  registerAll(exts: AiExtension[]): () => void;
  removePlugin(pluginId: string): number;

  resolve(ctx: AiInvocationContext): AiPromptResolution | null;
  findPrompt(slot: string, ctx?: AiInvocationContext): ReturnType<typeof findPromptBySlot>;
  renderTemplate: typeof renderUserTemplate;

  runSkill: typeof runSkill;
  runTool: typeof runTool;
  runAgent: typeof runAgent;

  buildContext: typeof buildContext;
  buildScopes: typeof buildScopes;

  list(): AiExtension[];
  diagnostics(): AiSdkDiagnostics;
}

export const aiSdkService: AiSdkService = {
  kind: "ai-sdk",
  register: (e) => aiExtensionRegistry.register(e),
  registerAll: (e) => aiExtensionRegistry.registerAll(e),
  removePlugin: (id) => aiExtensionRegistry.removePlugin(id),
  resolve: (ctx) => resolveAi(ctx),
  findPrompt: (slot, ctx) => findPromptBySlot(slot, ctx),
  renderTemplate: renderUserTemplate,
  runSkill,
  runTool,
  runAgent,
  buildContext,
  buildScopes,
  list: () => aiExtensionRegistry.listAll(),
  diagnostics: () => collectAiSdkDiagnostics(),
};
