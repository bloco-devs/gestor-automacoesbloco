import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowDefinition } from "@/modules/workflow-builder/types";
import {
  createWorkflow,
  duplicateWorkflow,
  listRecentLogs,
  listLogsByDemand,
  listWorkflows,
  setWorkflowEnabled,
  softDeleteWorkflow,
  updateWorkflow,
} from "./service";
import { workflowRuntime, type RuntimeEvent } from "./runtime";

const KEY_LIST = ["workflow-definitions"] as const;
const KEY_LOGS = (id?: string | null) => ["workflow-logs", id ?? "all"] as const;

export function useWorkflowDefinitions() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY_LIST, queryFn: listWorkflows });
  useEffect(() => {
    const ch = supabase
      .channel(`wf-defs-hook-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_definitions" },
        () => qc.invalidateQueries({ queryKey: KEY_LIST }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);
  return query;
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wf: WorkflowDefinition) => createWorkflow(wf),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LIST }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (wf: WorkflowDefinition) => updateWorkflow(wf),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LIST }),
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LIST }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => duplicateWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LIST }),
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => setWorkflowEnabled(v.id, v.enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LIST }),
  });
}

export function useWorkflowLogs(demandId?: string | null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEY_LOGS(demandId),
    queryFn: () => (demandId ? listLogsByDemand(demandId) : listRecentLogs(100)),
  });
  useEffect(() => {
    const ch = supabase
      .channel(`wf-logs-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "workflow_execution_logs" },
        () => qc.invalidateQueries({ queryKey: KEY_LOGS(demandId) }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc, demandId]);
  return query;
}

export function useWorkflowExecution() {
  return useMutation({
    mutationFn: (event: RuntimeEvent) => workflowRuntime.run(event),
  });
}
