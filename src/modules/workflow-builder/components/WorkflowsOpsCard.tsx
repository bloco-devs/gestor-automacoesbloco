import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Workflow } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkflows } from "../hooks/useWorkflows";

/** Card leve para o Centro de Operações. Sem métricas de execução (não há engine ainda). */
export function WorkflowsOpsCard() {
  const { items } = useWorkflows();
  const active = items.filter((w) => w.enabled).length;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          Workflows cadastrados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{items.length}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {active} ativo{active === 1 ? "" : "s"} — {" "}
          <Link to="/admin/workflows" className="text-primary hover:underline">gerenciar</Link>
        </p>
      </CardContent>
    </Card>
  );
}
