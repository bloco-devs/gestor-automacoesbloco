/**
 * WorkflowValidator — validação estrutural para a Engine.
 * Reusa o validator do Workflow Builder e adiciona checks de tipos de ação.
 */
import type { WorkflowDefinition } from "@/modules/workflow-builder/types";
import { validateWorkflow as builderValidate } from "@/modules/workflow-builder/validators/workflow";
import { hasExecutor } from "../registry/ActionRegistry";

export interface EngineValidationError {
  path: string;
  message: string;
}

export function validateForEngine(
  wf: WorkflowDefinition,
): EngineValidationError[] {
  const errors: EngineValidationError[] = builderValidate(wf).map((e) => ({
    path: e.path,
    message: e.message,
  }));
  wf.actions.forEach((a, i) => {
    if (a.type && !hasExecutor(a.type)) {
      errors.push({
        path: `actions[${i}]`,
        message: `Nenhum executor registrado para "${a.type}"`,
      });
    }
  });
  return errors;
}

export function isValidForEngine(wf: WorkflowDefinition): boolean {
  return validateForEngine(wf).length === 0;
}
