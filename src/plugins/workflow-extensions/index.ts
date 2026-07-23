/**
 * PLUGIN 005 — Workflow Extension Plugin (exemplo).
 * Registra 2 triggers, 2 actions, 2 conditions, 1 validator, 1 hook
 * via Workflow SDK. Nenhum import direto de módulos do app.
 */
import { definePlugin } from "@/platform-sdk";
import {
  workflowSdkService,
  bootstrapWorkflowSdkProvider,
  type WorkflowExtension,
} from "@/platform-sdk/workflow-sdk";

const PLUGIN_ID = "plugin.workflow-extensions";

const extensions: WorkflowExtension[] = [
  // ---------------------------- Triggers -----------------------------------
  {
    kind: "trigger",
    id: "trigger.demand.created",
    pluginId: PLUGIN_ID,
    name: "Demand Created",
    description: "Dispara quando uma nova demanda é criada.",
    category: "demand",
    outputs: [
      { name: "demandId", type: "string", required: true },
      { name: "requesterId", type: "string" },
    ],
    execute: (_ctx, payload) => ({
      demandId: (payload?.demandId as string) ?? `demo_${Date.now()}`,
    }),
    health: () => "ok",
  },
  {
    kind: "trigger",
    id: "trigger.knowledge.published",
    pluginId: PLUGIN_ID,
    name: "Knowledge Published",
    description: "Dispara quando um artigo é publicado.",
    category: "knowledge",
    outputs: [{ name: "articleId", type: "string", required: true }],
    execute: (_ctx, payload) => ({
      articleId: (payload?.articleId as string) ?? "demo-article",
    }),
  },

  // --------------------------- Conditions ----------------------------------
  {
    kind: "condition",
    id: "condition.user.role",
    pluginId: PLUGIN_ID,
    name: "User Role",
    description: "Verifica se o usuário possui uma role específica.",
    category: "core",
    inputs: [
      { name: "role", type: "string", required: true },
      { name: "userRoles", type: "json", required: true },
    ],
    evaluate: (_ctx, payload) => {
      const role = payload.role as string | undefined;
      const roles = (payload.userRoles as string[] | undefined) ?? [];
      return !!role && roles.includes(role);
    },
  },
  {
    kind: "condition",
    id: "condition.workflow.priority",
    pluginId: PLUGIN_ID,
    name: "Priority",
    description: "Verifica se a prioridade da demanda é maior ou igual ao limite.",
    category: "demand",
    inputs: [
      { name: "priority", type: "number", required: true },
      { name: "threshold", type: "number", required: true },
    ],
    evaluate: (_ctx, payload) =>
      Number(payload.priority ?? 0) >= Number(payload.threshold ?? 0),
  },

  // ----------------------------- Actions -----------------------------------
  {
    kind: "action",
    id: "action.demand.comment",
    pluginId: PLUGIN_ID,
    name: "Criar comentário",
    description: "Registra um comentário automatizado (exemplo).",
    category: "demand",
    inputs: [
      { name: "demandId", type: "string", required: true },
      { name: "message", type: "string", required: true },
    ],
    execute: (_ctx, payload) => ({
      ok: true,
      output: {
        commentId: `cmt_${Date.now().toString(36)}`,
        demandId: payload.demandId,
      },
    }),
    health: () => "ok",
  },
  {
    kind: "action",
    id: "action.notify.copilot",
    pluginId: PLUGIN_ID,
    name: "Enviar para Copilot",
    description: "Envia um evento para o Copilot processar (exemplo).",
    category: "ai",
    inputs: [{ name: "text", type: "string", required: true }],
    execute: (_ctx, payload) => ({
      ok: true,
      output: { received: !!payload.text },
    }),
  },

  // ---------------------------- Validator ----------------------------------
  {
    kind: "validator",
    id: "validator.no-empty-name",
    pluginId: PLUGIN_ID,
    name: "Workflow deve ter nome",
    description: "Anti-pattern: workflow sem nome.",
    category: "core",
    validate: (def) => {
      const d = def as { name?: string } | null;
      if (!d || typeof d !== "object") return [];
      if (!d.name || !d.name.trim()) {
        return [
          {
            severity: "warning",
            message: "Workflow sem nome",
            code: "workflow.no-name",
            path: "name",
          },
        ];
      }
      return [];
    },
  },

  // ------------------------------ Hook -------------------------------------
  {
    kind: "hook",
    id: "hook.telemetry",
    pluginId: PLUGIN_ID,
    name: "Telemetry Hook",
    description: "Loga fases de execução (exemplo).",
    category: "core",
    beforeExecute: (ctx) => ctx.logger?.(`[wf] before run=${ctx.runId}`),
    afterExecute: (ctx) => ctx.logger?.(`[wf] after run=${ctx.runId}`),
    onError: (ctx) => ctx.logger?.(`[wf] error run=${ctx.runId}: ${ctx.error}`),
  },
];

let disposer: (() => void) | null = null;

export const WorkflowExtensionsPlugin = definePlugin({
  id: PLUGIN_ID,
  name: "Workflow Extensions (Demo)",
  version: "1.0.0",
  category: "integration",
  description:
    "Plugin de exemplo que registra triggers, conditions, actions, validators e hooks no Workflow SDK.",
  author: "platform.bundled",
  activate: (_ctx) => {
    bootstrapWorkflowSdkProvider();
    disposer = workflowSdkService.registerAll(extensions);
  },
  deactivate: () => {
    disposer?.();
    disposer = null;
    workflowSdkService.removePlugin(PLUGIN_ID);
  },
});

export default WorkflowExtensionsPlugin;
export { extensions as workflowExtensionsSampleList };
