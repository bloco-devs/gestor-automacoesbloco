/**
 * Persistência de workflows — agora via Supabase (workflow_definitions).
 * Mantém a API do hook original para compatibilidade com o Editor/Lista.
 */
import { useCallback } from "react";
import type { WorkflowDefinition } from "../types";
import { uid } from "../utils/id";
import { emptyRootGroup } from "../validators/workflow";
import {
  useCreateWorkflow,
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useUpdateWorkflow,
  useWorkflowDefinitions,
} from "@/modules/workflow-runtime/hooks";
import { getWorkflow } from "@/modules/workflow-runtime/service";

export function makeEmptyWorkflow(author = "Você"): WorkflowDefinition {
  const now = new Date().toISOString();
  return {
    id: uid("wf"),
    name: "",
    description: "",
    enabled: true,
    category: "Geral",
    priority: 50,
    notes: "",
    trigger: "demand.created",
    conditions: emptyRootGroup(),
    actions: [],
    version: 1,
    author,
    created_at: now,
    updated_at: now,
  };
}

export function useWorkflows() {
  const { data: items = [], isLoading } = useWorkflowDefinitions();
  const createMut = useCreateWorkflow();
  const updateMut = useUpdateWorkflow();
  const deleteMut = useDeleteWorkflow();
  const duplicateMut = useDuplicateWorkflow();

  const create = useCallback(
    (wf: WorkflowDefinition) => createMut.mutateAsync(wf),
    [createMut],
  );
  const update = useCallback(
    (wf: WorkflowDefinition) => updateMut.mutateAsync(wf),
    [updateMut],
  );
  const remove = useCallback(
    (id: string) => deleteMut.mutateAsync(id),
    [deleteMut],
  );
  const duplicate = useCallback(
    (id: string) => duplicateMut.mutateAsync(id),
    [duplicateMut],
  );
  const getById = useCallback((id: string) => getWorkflow(id), []);

  return { items, isLoading, create, update, remove, duplicate, getById };
}
