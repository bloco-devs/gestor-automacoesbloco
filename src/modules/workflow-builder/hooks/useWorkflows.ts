/**
 * Store em memória com persistência opcional em localStorage.
 * SEM Supabase, SEM banco. Base para a futura Engine.
 */
import { useCallback, useEffect, useState } from "react";
import type { WorkflowDefinition } from "../types";
import { uid } from "../utils/id";
import { emptyRootGroup } from "../validators/workflow";

const STORAGE_KEY = "workflow-builder:drafts:v1";

function readStore(): WorkflowDefinition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkflowDefinition[]) : [];
  } catch {
    return [];
  }
}

function writeStore(list: WorkflowDefinition[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* silent */
  }
}

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

const listeners = new Set<() => void>();
function notify() {
  for (const fn of listeners) fn();
}

export function useWorkflows() {
  const [items, setItems] = useState<WorkflowDefinition[]>(() => readStore());

  useEffect(() => {
    const l = () => setItems(readStore());
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const persist = useCallback((next: WorkflowDefinition[]) => {
    writeStore(next);
    setItems(next);
    notify();
  }, []);

  const create = useCallback(
    (wf: WorkflowDefinition) => {
      const next = [wf, ...readStore()];
      persist(next);
      return wf;
    },
    [persist],
  );

  const update = useCallback(
    (wf: WorkflowDefinition) => {
      const now = new Date().toISOString();
      const prev = readStore();
      const existing = prev.find((x) => x.id === wf.id);
      const updated: WorkflowDefinition = {
        ...wf,
        version: existing ? existing.version + 1 : wf.version,
        updated_at: now,
      };
      const next = existing
        ? prev.map((x) => (x.id === wf.id ? updated : x))
        : [updated, ...prev];
      persist(next);
      return updated;
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(readStore().filter((x) => x.id !== id));
    },
    [persist],
  );

  const duplicate = useCallback(
    (id: string) => {
      const src = readStore().find((x) => x.id === id);
      if (!src) return null;
      const clone: WorkflowDefinition = {
        ...src,
        id: uid("wf"),
        name: `${src.name} (cópia)`,
        version: 1,
        enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      persist([clone, ...readStore()]);
      return clone;
    },
    [persist],
  );

  const getById = useCallback((id: string) => readStore().find((x) => x.id === id) ?? null, []);

  return { items, create, update, remove, duplicate, getById };
}
