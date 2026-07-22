import { useParams } from "react-router-dom";
import { WorkflowEditor, useWorkflows } from "@/modules/workflow-builder";

export default function WorkflowEditorPage() {
  const { id } = useParams();
  const { getById } = useWorkflows();
  const initial = id && id !== "novo" ? getById(id) : null;
  return <WorkflowEditor initial={initial} />;
}
