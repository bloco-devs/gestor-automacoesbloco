import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { WorkflowEditor } from "@/modules/workflow-builder";
import { getWorkflow } from "@/modules/workflow-runtime/service";
import type { WorkflowDefinition } from "@/modules/workflow-builder/types";

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const [initial, setInitial] = useState<WorkflowDefinition | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!id || id === "novo") {
      setInitial(null);
      return;
    }
    getWorkflow(id).then((wf) => {
      if (!cancelled) setInitial(wf);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (initial === undefined) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando…</div>;
  }
  return <WorkflowEditor initial={initial} />;
}
