/**
 * Adapters MOCK — não tocam banco, não fazem I/O real.
 * Registram chamadas em memória; usados em dryRun e nos testes.
 */
import type {
  AdapterCallContext,
  DemandAdapter,
  EngineAdapters,
  InboxAdapter,
  KnowledgeAdapter,
  NotificationAdapter,
  OperationsAdapter,
  RoutingAdapter,
} from "./interfaces";

export interface MockCall {
  adapter: string;
  method: string;
  args: unknown[];
  at: string;
  ctx: AdapterCallContext;
}

export interface MockAdapters extends EngineAdapters {
  __calls: MockCall[];
  reset(): void;
}

export function createMockAdapters(): MockAdapters {
  const calls: MockCall[] = [];
  const record =
    (adapter: string, method: string) =>
    (ctx: AdapterCallContext, ...args: unknown[]) => {
      calls.push({ adapter, method, args, at: new Date().toISOString(), ctx });
    };

  const demand: DemandAdapter = {
    setPriority: record("demand", "setPriority"),
    setAssignee: record("demand", "setAssignee"),
    addComment: record("demand", "addComment"),
    createTask: record("demand", "createTask"),
  };
  const notification: NotificationAdapter = {
    send: record("notification", "send"),
  };
  const knowledge: KnowledgeAdapter = {
    relateArticle: record("knowledge", "relateArticle"),
  };
  const routing: RoutingAdapter = {
    runSmartRouting: record("routing", "runSmartRouting"),
  };
  const inbox: InboxAdapter = { refresh: record("inbox", "refresh") };
  const operations: OperationsAdapter = {
    logAudit: record("operations", "logAudit"),
  };

  return {
    demand,
    notification,
    knowledge,
    routing,
    inbox,
    operations,
    __calls: calls,
    reset() {
      calls.length = 0;
    },
  };
}
