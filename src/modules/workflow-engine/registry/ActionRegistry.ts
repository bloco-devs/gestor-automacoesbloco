/**
 * ActionRegistry — mapeia ActionType -> executor.
 * Registry Pattern. Executores recebem adapters injetados.
 */
import type {
  ActionType,
  WorkflowAction,
} from "@/modules/workflow-builder/types";
import type { AdapterCallContext, EngineAdapters } from "../adapters/interfaces";

export interface ActionExecutor {
  type: ActionType;
  describe(action: WorkflowAction): string;
  execute(
    action: WorkflowAction,
    ctx: AdapterCallContext,
    adapters: EngineAdapters,
  ): Promise<unknown> | unknown;
}

const registry = new Map<ActionType, ActionExecutor>();

export function registerExecutor(exec: ActionExecutor): void {
  registry.set(exec.type, exec);
}

export function getExecutor(type: ActionType): ActionExecutor | undefined {
  return registry.get(type);
}

export function hasExecutor(type: ActionType): boolean {
  return registry.has(type);
}

export function listExecutors(): ActionExecutor[] {
  return Array.from(registry.values());
}

export function clearRegistry(): void {
  registry.clear();
}

/* ---------- Executores default (todos delegam a adapters MOCK) ---------- */

function str(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

const defaults: ActionExecutor[] = [
  {
    type: "set_priority",
    describe: (a) => `Alterar prioridade para ${str(a.params.priority, "?")}`,
    execute: (a, ctx, ad) => ad.demand.setPriority(ctx, str(a.params.priority)),
  },
  {
    type: "set_assignee",
    describe: (a) => `Alterar responsável para ${str(a.params.assignee, "?")}`,
    execute: (a, ctx, ad) => ad.demand.setAssignee(ctx, str(a.params.assignee)),
  },
  {
    type: "run_smart_routing",
    describe: () => "Executar Smart Routing",
    execute: (_a, ctx, ad) => ad.routing.runSmartRouting(ctx),
  },
  {
    type: "add_comment",
    describe: (a) => `Adicionar comentário: ${str(a.params.text, "")}`,
    execute: (a, ctx, ad) => ad.demand.addComment(ctx, str(a.params.text)),
  },
  {
    type: "create_task",
    describe: (a) => `Criar atividade: ${str(a.params.title, "")}`,
    execute: (a, ctx, ad) => ad.demand.createTask(ctx, str(a.params.title)),
  },
  {
    type: "relate_knowledge_article",
    describe: (a) => `Relacionar artigo ${str(a.params.article_id, "?")}`,
    execute: (a, ctx, ad) =>
      ad.knowledge.relateArticle(ctx, str(a.params.article_id)),
  },
  {
    type: "send_notification",
    describe: (a) => `Notificar ${str(a.params.to, "?")}`,
    execute: (a, ctx, ad) =>
      ad.notification.send(ctx, str(a.params.to), str(a.params.message)),
  },
  {
    type: "refresh_inbox",
    describe: () => "Atualizar Inbox",
    execute: (_a, ctx, ad) => ad.inbox.refresh(ctx),
  },
  {
    type: "log_audit",
    describe: (a) => `Auditoria: ${str(a.params.event, "workflow")}`,
    execute: (a, ctx, ad) =>
      ad.operations.logAudit(ctx, str(a.params.event, "workflow")),
  },
];

defaults.forEach(registerExecutor);
