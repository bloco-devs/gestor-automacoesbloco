/**
 * Catálogo de Domain Events versionados.
 * Cada evento carrega:
 *  - `name`: identificador estável (namespace por bounded context)
 *  - `v`: versão do payload
 *  - `at`: timestamp ISO
 *  - `payload`: dados imutáveis
 *
 * Nunca renomear um evento existente — criar uma nova versão.
 */

export interface BaseDomainEvent<TName extends string, TPayload> {
  name: TName;
  v: number;
  at: string;
  payload: TPayload;
  actorId?: string;
}

// -------------------- Board / Cards --------------------
export type CardCreated = BaseDomainEvent<"card.created", { cardId: string; boardId: string; columnId: string; titulo: string }>;
export type CardUpdated = BaseDomainEvent<"card.updated", { cardId: string; boardId: string; changes: Record<string, unknown> }>;
export type CardMoved = BaseDomainEvent<"card.moved", { cardId: string; boardId: string; fromColumnId: string; toColumnId: string; toIndex: number }>;
export type CardDeleted = BaseDomainEvent<"card.deleted", { cardId: string; boardId: string }>;

// -------------------- Tasks / Checklists --------------------
export type TaskCompleted = BaseDomainEvent<"task.completed", { taskId: string; parentId: string; kind: "demand" | "solucao" | "demanda" }>;
export type TaskStateChanged = BaseDomainEvent<"task.state_changed", { taskId: string; from: string; to: string }>;

// -------------------- Workflow / Automations --------------------
export type WorkflowExecuted = BaseDomainEvent<"workflow.executed", { definitionId: string; status: "success" | "partial" | "failed"; durationMs: number }>;
export type AutomationExecuted = BaseDomainEvent<"automation.executed", { automationId: string; trigger: string; actionsRun: number; failed: number }>;

// -------------------- Notifications --------------------
export type NotificationSent = BaseDomainEvent<"notification.sent", { recipientId: string; channel: "in_app" | "email" | "teams" | "whatsapp"; kind: string }>;

// -------------------- Requests / Demands --------------------
export type RequestCreated = BaseDomainEvent<"request.created", { requestId: string; userId: string; tipo?: string }>;
export type RequestStatusChanged = BaseDomainEvent<"request.status_changed", { requestId: string; from: string; to: string }>;

// -------------------- AI --------------------
export type AiPromptExecuted = BaseDomainEvent<"ai.prompt_executed", { prompt: string; version: number; model: string; tokensIn: number; tokensOut: number; cacheHit: boolean; costUsd: number; durationMs: number }>;

export type DomainEvent =
  | CardCreated
  | CardUpdated
  | CardMoved
  | CardDeleted
  | TaskCompleted
  | TaskStateChanged
  | WorkflowExecuted
  | AutomationExecuted
  | NotificationSent
  | RequestCreated
  | RequestStatusChanged
  | AiPromptExecuted;

export type DomainEventName = DomainEvent["name"];
export type PayloadOf<N extends DomainEventName> = Extract<DomainEvent, { name: N }>["payload"];
