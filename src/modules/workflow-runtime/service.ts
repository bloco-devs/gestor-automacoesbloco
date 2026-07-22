/**
 * Workflow Runtime — camada de persistência + execução.
 * Conecta Workflow Builder (006A) e Workflow Engine (006B) ao Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ConditionGroup,
  TriggerKind,
  WorkflowAction,
  WorkflowDefinition,
} from "@/modules/workflow-builder/types";
import { emptyRootGroup } from "@/modules/workflow-builder/validators/workflow";

// Tabelas ainda não estão nos types gerados até o próximo refresh.
// Isolamos o cast num único ponto.
type AnyTable = never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const TABLE_DEFS = "workflow_definitions";
const TABLE_LOGS = "workflow_execution_logs";

export interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  trigger: string;
  definition: Record<string, unknown>;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkflowLogRow {
  id: string;
  workflow_id: string;
  demand_id: string | null;
  status: string;
  duration_ms: number;
  execution_result: Record<string, unknown>;
  actor_id: string | null;
  created_at: string;
}

/* ---------- Mapeamento row <-> WorkflowDefinition ---------- */

function rowToWorkflow(row: WorkflowRow): WorkflowDefinition {
  const def = (row.definition ?? {}) as {
    category?: string;
    notes?: string;
    conditions?: ConditionGroup;
    actions?: WorkflowAction[];
    author?: string;
  };
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    enabled: !!row.enabled,
    priority: row.priority ?? 50,
    trigger: (row.trigger as TriggerKind) ?? "demand.created",
    category: def.category ?? "Geral",
    notes: def.notes ?? "",
    conditions: def.conditions ?? emptyRootGroup(),
    actions: def.actions ?? [],
    version: row.version ?? 1,
    author: def.author ?? "—",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function workflowToInsert(wf: WorkflowDefinition, userId: string | null) {
  return {
    name: wf.name,
    description: wf.description ?? "",
    enabled: wf.enabled,
    priority: wf.priority ?? 50,
    trigger: wf.trigger,
    definition: {
      category: wf.category,
      notes: wf.notes,
      conditions: wf.conditions,
      actions: wf.actions,
      author: wf.author,
    },
    created_by: userId,
    updated_by: userId,
  };
}

function workflowToUpdate(wf: WorkflowDefinition, userId: string | null) {
  return {
    name: wf.name,
    description: wf.description ?? "",
    enabled: wf.enabled,
    priority: wf.priority ?? 50,
    trigger: wf.trigger,
    definition: {
      category: wf.category,
      notes: wf.notes,
      conditions: wf.conditions,
      actions: wf.actions,
      author: wf.author,
    },
    updated_by: userId,
  };
}

/* ---------- CRUD ---------- */

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const { data, error } = await db
    .from(TABLE_DEFS as AnyTable)
    .select("*")
    .is("deleted_at", null)
    .order("priority", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as WorkflowRow[]).map(rowToWorkflow);
}

export async function listActiveWorkflows(): Promise<WorkflowDefinition[]> {
  const { data, error } = await db
    .from(TABLE_DEFS as AnyTable)
    .select("*")
    .is("deleted_at", null)
    .eq("enabled", true)
    .order("priority", { ascending: false });
  if (error) throw error;
  return (data as WorkflowRow[]).map(rowToWorkflow);
}

export async function getWorkflow(id: string): Promise<WorkflowDefinition | null> {
  const { data, error } = await db
    .from(TABLE_DEFS as AnyTable)
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToWorkflow(data as WorkflowRow) : null;
}

export async function createWorkflow(wf: WorkflowDefinition): Promise<WorkflowDefinition> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { data, error } = await db
    .from(TABLE_DEFS as AnyTable)
    .insert(workflowToInsert(wf, uid))
    .select("*")
    .single();
  if (error) throw error;
  return rowToWorkflow(data as WorkflowRow);
}

export async function updateWorkflow(wf: WorkflowDefinition): Promise<WorkflowDefinition> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { data, error } = await db
    .from(TABLE_DEFS as AnyTable)
    .update(workflowToUpdate(wf, uid))
    .eq("id", wf.id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToWorkflow(data as WorkflowRow);
}

export async function setWorkflowEnabled(id: string, enabled: boolean): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { error } = await db
    .from(TABLE_DEFS as AnyTable)
    .update({ enabled, updated_by: uid })
    .eq("id", id);
  if (error) throw error;
}

export async function softDeleteWorkflow(id: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { error } = await db
    .from(TABLE_DEFS as AnyTable)
    .update({ deleted_at: new Date().toISOString(), updated_by: uid })
    .eq("id", id);
  if (error) throw error;
}

export async function duplicateWorkflow(id: string): Promise<WorkflowDefinition | null> {
  const src = await getWorkflow(id);
  if (!src) return null;
  const clone: WorkflowDefinition = {
    ...src,
    id: crypto.randomUUID(),
    name: `${src.name} (cópia)`,
    enabled: false,
    version: 1,
  };
  return createWorkflow(clone);
}

/* ---------- Logs ---------- */

export interface InsertLogInput {
  workflow_id: string;
  demand_id?: string | null;
  status: string;
  duration_ms: number;
  execution_result: Record<string, unknown>;
}

export async function insertExecutionLog(input: InsertLogInput): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id ?? null;
  const { error } = await db.from(TABLE_LOGS as AnyTable).insert({
    workflow_id: input.workflow_id,
    demand_id: input.demand_id ?? null,
    status: input.status,
    duration_ms: input.duration_ms,
    execution_result: input.execution_result,
    actor_id: uid,
  });
  if (error) {
    // Nunca quebrar UX por causa do log.
    console.warn("[workflow-runtime] falha ao gravar log:", error.message);
  }
}

export async function listRecentLogs(limit = 50): Promise<WorkflowLogRow[]> {
  const { data, error } = await db
    .from(TABLE_LOGS as AnyTable)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as WorkflowLogRow[];
}

export async function listLogsByDemand(demandId: string): Promise<WorkflowLogRow[]> {
  const { data, error } = await db
    .from(TABLE_LOGS as AnyTable)
    .select("*")
    .eq("demand_id", demandId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as WorkflowLogRow[];
}
