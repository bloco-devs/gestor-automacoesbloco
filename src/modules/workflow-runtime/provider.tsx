import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { workflowRuntime } from "./runtime";

interface RuntimeCtx {
  ready: boolean;
}
const RuntimeContext = createContext<RuntimeCtx>({ ready: false });

export function WorkflowRuntimeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workflowRuntime.refresh().then(() => {
      if (!cancelled) setReady(true);
    });
    const channel = supabase
      .channel(`wf-defs-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_definitions" },
        () => {
          workflowRuntime.refresh();
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return <RuntimeContext.Provider value={{ ready }}>{children}</RuntimeContext.Provider>;
}

export function useWorkflowRuntimeReady() {
  return useContext(RuntimeContext).ready;
}
