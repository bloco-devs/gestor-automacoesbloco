/**
 * Validação estrutural do workflow (sem Zod para ficar leve e sem deps novas).
 * Retorna lista de erros humanamente legível.
 */
import type {
  ConditionGroup,
  ConditionNode,
  WorkflowAction,
  WorkflowDefinition,
} from "../types";

export interface ValidationError {
  path: string;
  message: string;
}

function validateNode(node: ConditionNode, path: string, errors: ValidationError[]): void {
  if (node.kind === "condition") {
    if (!node.field) errors.push({ path, message: "Selecione o campo" });
    if (!node.operator) errors.push({ path, message: "Selecione a comparação" });
    const needsValue = node.operator !== "is_set" && node.operator !== "is_unset";
    if (needsValue) {
      const v = node.value;
      const empty =
        v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) errors.push({ path, message: "Informe um valor" });
    }
    return;
  }
  if (!node.children.length && node.op !== "NOT" && path !== "conditions") {
    errors.push({ path, message: "Grupo vazio — adicione ao menos uma condição" });
  }
  node.children.forEach((c, i) => validateNode(c, `${path}.children[${i}]`, errors));
}

function validateAction(a: WorkflowAction, path: string, errors: ValidationError[]): void {
  if (!a.type) errors.push({ path, message: "Selecione o tipo da ação" });
}

export function validateWorkflow(wf: WorkflowDefinition): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!wf.name?.trim()) errors.push({ path: "name", message: "Dê um nome ao workflow" });
  if (!wf.trigger) errors.push({ path: "trigger", message: "Escolha um gatilho" });
  validateNode(wf.conditions, "conditions", errors);
  if (!wf.actions.length)
    errors.push({ path: "actions", message: "Adicione ao menos uma ação" });
  wf.actions.forEach((a, i) => validateAction(a, `actions[${i}]`, errors));
  return errors;
}

export function isValid(wf: WorkflowDefinition): boolean {
  return validateWorkflow(wf).length === 0;
}

export function emptyRootGroup(): ConditionGroup {
  return { id: "root", kind: "group", op: "AND", children: [] };
}
