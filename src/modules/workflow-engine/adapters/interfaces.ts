/**
 * Interfaces de Adapters — contratos para futura integração.
 * Nesta Feature (006B) apenas as interfaces são definidas; nenhum adapter
 * altera produção. Implementações concretas serão MOCKS (ver ./mocks.ts).
 */
import type { EngineContext } from "../types";

export interface AdapterCallContext {
  engine: EngineContext;
  workflowId: string;
  stepId: string;
}

export interface DemandAdapter {
  setPriority(
    ctx: AdapterCallContext,
    priority: string,
  ): Promise<void> | void;
  setAssignee(
    ctx: AdapterCallContext,
    assignee: string,
  ): Promise<void> | void;
  addComment(ctx: AdapterCallContext, text: string): Promise<void> | void;
  createTask(ctx: AdapterCallContext, title: string): Promise<void> | void;
}

export interface NotificationAdapter {
  send(
    ctx: AdapterCallContext,
    to: string,
    message?: string,
  ): Promise<void> | void;
}

export interface KnowledgeAdapter {
  relateArticle(
    ctx: AdapterCallContext,
    articleId: string,
  ): Promise<void> | void;
}

export interface RoutingAdapter {
  runSmartRouting(ctx: AdapterCallContext): Promise<void> | void;
}

export interface InboxAdapter {
  refresh(ctx: AdapterCallContext): Promise<void> | void;
}

export interface OperationsAdapter {
  logAudit(ctx: AdapterCallContext, event: string): Promise<void> | void;
}

export interface EngineAdapters {
  demand: DemandAdapter;
  notification: NotificationAdapter;
  knowledge: KnowledgeAdapter;
  routing: RoutingAdapter;
  inbox: InboxAdapter;
  operations: OperationsAdapter;
}
