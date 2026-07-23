/**
 * AI SDK — types.
 * Aditivo, sem depender do Core.
 */

export type AiCapability =
  | "chat"
  | "summarize"
  | "classify"
  | "extract"
  | "route"
  | "reason"
  | "explain"
  | "search";

export type AiContextRequirement =
  | "route"
  | "module"
  | "profile"
  | "entity"
  | "workspace"
  | "portal"
  | "custom";

export interface AiInvocationContext {
  route?: string;
  module?: string;
  profile?: string;
  entityId?: string;
  entityKind?: string;
  metadata?: Record<string, unknown>;
}

export interface AiExecutionResult<T = unknown> {
  ok: boolean;
  output?: T;
  error?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

// ── Skill
export interface AiSkill<I = unknown, O = unknown> {
  kind: "skill";
  id: string;
  pluginId: string;
  title: string;
  description?: string;
  category?: string;
  capabilities?: AiCapability[];
  contextRequirements?: AiContextRequirement[];
  version?: string;
  enabled?: boolean;
  execute: (input: I, ctx: AiInvocationContext) => AiExecutionResult<O> | Promise<AiExecutionResult<O>>;
  health?: () => "ok" | "degraded" | "down";
}

// ── Prompt
export interface AiPromptVariable {
  name: string;
  description?: string;
  required?: boolean;
}

export interface AiPrompt {
  kind: "prompt";
  id: string;
  pluginId: string;
  slot: string; // ex: "copilot.route", "portal.suggest"
  version: string;
  author?: string;
  description?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
  userTemplate?: string;
  variables?: AiPromptVariable[];
  outputSchema?: Record<string, unknown>;
  fallbackPromptId?: string;
  match?: (ctx: AiInvocationContext) => boolean;
  priority?: number;
}

// ── Tool
export interface AiTool<I = unknown, O = unknown> {
  kind: "tool";
  id: string;
  pluginId: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  permissions?: string[];
  execute: (input: I, ctx: AiInvocationContext) => AiExecutionResult<O> | Promise<AiExecutionResult<O>>;
  health?: () => "ok" | "degraded" | "down";
}

// ── Context Builder
export interface AiContextBuilder {
  kind: "context-builder";
  id: string;
  pluginId: string;
  scope: string; // ex: "demand", "developer", "portal", "knowledge"
  description?: string;
  build: (ctx: AiInvocationContext) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

// ── Agent
export interface AiAgentRoutingPolicy {
  scopes?: string[];
  modules?: string[];
  capabilities?: AiCapability[];
  priority?: number;
}

export interface AiAgent {
  kind: "agent";
  id: string;
  pluginId: string;
  name: string;
  description?: string;
  version?: string;
  promptSlot?: string;
  toolIds?: string[];
  contextScopes?: string[];
  memoryId?: string;
  routingPolicy?: AiAgentRoutingPolicy;
  plan?: (input: string, ctx: AiInvocationContext) => Promise<string[]> | string[];
  execute: (input: string, ctx: AiInvocationContext) => Promise<AiExecutionResult> | AiExecutionResult;
  health?: () => "ok" | "degraded" | "down";
}

// ── Memory
export interface AiMemoryEntry {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export type AiMemoryScope =
  | "session"
  | "conversation"
  | "workspace"
  | "temporary"
  | "readonly"
  | "mock";

export interface AiMemoryProvider {
  kind: "memory-provider";
  id: string;
  pluginId: string;
  scope: AiMemoryScope;
  description?: string;
  append: (key: string, entry: AiMemoryEntry) => void;
  list: (key: string) => AiMemoryEntry[];
  clear: (key: string) => void;
  readOnly?: boolean;
}

// ── Router
export interface AiPromptResolution {
  prompt: AiPrompt;
  skill?: AiSkill;
  agent?: AiAgent;
  fallbackUsed?: boolean;
  reason?: string;
}

export interface AiRouter {
  kind: "router";
  id: string;
  pluginId: string;
  description?: string;
  priority?: number;
  resolve: (ctx: AiInvocationContext) => AiPromptResolution | null | undefined;
}

export type AiExtension =
  | AiSkill
  | AiPrompt
  | AiTool
  | AiContextBuilder
  | AiAgent
  | AiMemoryProvider
  | AiRouter;

export type AiExtensionKind = AiExtension["kind"];
