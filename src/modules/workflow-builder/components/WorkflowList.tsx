import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useWorkflows } from "../hooks/useWorkflows";
import type { ConditionGroup } from "../types";

function countConditions(g: ConditionGroup): number {
  let n = 0;
  for (const c of g.children) {
    if (c.kind === "condition") n += 1;
    else n += countConditions(c);
  }
  return n;
}

export function WorkflowList() {
  const nav = useNavigate();
  const { items, remove, duplicate } = useWorkflows();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted-foreground">Regras "quando isso acontecer, faça aquilo" — sem código.</p>
        </div>
        <Button onClick={() => nav("/admin/workflows/novo")}>
          <Plus className="size-4 mr-1" /> Novo workflow
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum workflow ainda. Comece criando o primeiro.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Condições</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Última alteração</TableHead>
                  <TableHead className="text-right">Operações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((wf) => (
                  <TableRow key={wf.id}>
                    <TableCell>
                      <div className="font-medium">{wf.name || <span className="text-muted-foreground italic">sem nome</span>}</div>
                      {wf.description && <div className="text-xs text-muted-foreground line-clamp-1">{wf.description}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={wf.enabled ? "default" : "outline"}>{wf.enabled ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{countConditions(wf.conditions)}</TableCell>
                    <TableCell className="text-center text-sm">{wf.actions.length}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{wf.author}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(wf.updated_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => nav(`/admin/workflows/${wf.id}`)}>
                          <Eye className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => nav(`/admin/workflows/${wf.id}`)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                          const c = duplicate(wf.id);
                          if (c) toast.success("Workflow duplicado");
                        }}>
                          <Copy className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => {
                          remove(wf.id);
                          toast.success("Workflow removido");
                        }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
