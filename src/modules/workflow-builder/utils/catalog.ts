/**
 * Catálogos legíveis para o editor (Human First — nada de jargão técnico exposto).
 * Reutiliza metadata dos módulos existentes onde possível.
 */
import {
  COMPLEXITY_META,
  PRIORITY_META,
  STATUS_COLUMNS,
  TYPE_META,
} from "@/modules/demands/types";
import type {
  ActionType,
  ConditionField,
  ConditionOperator,
  TriggerKind,
} from "../types";

export const TRIGGER_LABELS: Record<TriggerKind, string> = {
  "demand.created": "Uma nova solicitação for criada",
  "demand.updated": "Uma solicitação for atualizada",
  "demand.priority_changed": "A prioridade mudar",
  "demand.assignee_changed": "O responsável mudar",
  "demand.status_changed": "O status mudar",
  manual: "For acionado manualmente",
};

export const FIELD_LABELS: Record<ConditionField, string> = {
  type: "Tipo",
  system: "Sistema",
  priority: "Prioridade",
  status: "Status",
  complexity: "Complexidade",
  assignee: "Responsável",
  sla_status: "SLA",
  origin: "Origem",
  keyword: "Palavra-chave",
  category: "Categoria",
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: "é igual a",
  neq: "é diferente de",
  in: "é um de",
  not_in: "não é um de",
  contains: "contém",
  is_set: "está preenchido",
  is_unset: "está vazio",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  set_priority: "Alterar prioridade",
  set_assignee: "Alterar responsável",
  run_smart_routing: "Executar Smart Routing",
  add_comment: "Adicionar comentário",
  create_task: "Criar atividade",
  relate_knowledge_article: "Relacionar artigo da base",
  send_notification: "Enviar notificação",
  refresh_inbox: "Atualizar Inbox",
  log_audit: "Registrar auditoria",
};

export const ACTION_HINTS: Record<ActionType, string> = {
  set_priority: "Ex.: elevar para Alta quando SLA estourar.",
  set_assignee: "Escolha um responsável fixo.",
  run_smart_routing: "Sugere o melhor responsável reutilizando o motor existente.",
  add_comment: "Comentário interno automático.",
  create_task: "Cria uma atividade vinculada à solicitação.",
  relate_knowledge_article: "Sugere artigo da Central de Soluções.",
  send_notification: "Notifica pessoa ou equipe.",
  refresh_inbox: "Faz o item subir na Inbox de quem for responsável.",
  log_audit: "Registra evento na trilha de auditoria.",
};

export function valueOptionsFor(field: ConditionField): { value: string; label: string }[] | null {
  switch (field) {
    case "type":
      return Object.entries(TYPE_META).map(([v, m]) => ({ value: v, label: m.label }));
    case "priority":
      return Object.entries(PRIORITY_META).map(([v, m]) => ({ value: v, label: m.label }));
    case "status":
      return STATUS_COLUMNS.map((s) => ({ value: s.id, label: s.label }));
    case "complexity":
      return Object.entries(COMPLEXITY_META).map(([v, m]) => ({ value: v, label: m.label }));
    case "sla_status":
      return [
        { value: "no_prazo", label: "No prazo" },
        { value: "atencao", label: "Atenção" },
        { value: "estourado", label: "Estourado" },
      ];
    default:
      return null; // texto livre
  }
}

export const TRIGGERS: TriggerKind[] = [
  "demand.created",
  "demand.updated",
  "demand.priority_changed",
  "demand.assignee_changed",
  "demand.status_changed",
  "manual",
];

export const ACTIONS: ActionType[] = [
  "set_priority",
  "set_assignee",
  "run_smart_routing",
  "add_comment",
  "create_task",
  "relate_knowledge_article",
  "send_notification",
  "refresh_inbox",
  "log_audit",
];

export const FIELDS: ConditionField[] = [
  "type",
  "priority",
  "status",
  "complexity",
  "system",
  "assignee",
  "sla_status",
  "origin",
  "category",
  "keyword",
];

export function operatorsFor(field: ConditionField): ConditionOperator[] {
  const list = valueOptionsFor(field);
  if (list) return ["eq", "neq", "in", "not_in", "is_set", "is_unset"];
  return ["eq", "neq", "contains", "is_set", "is_unset"];
}
