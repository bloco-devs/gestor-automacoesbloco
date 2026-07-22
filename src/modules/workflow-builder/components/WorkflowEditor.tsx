import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, Save } from "lucide-react";
import type { WorkflowDefinition } from "../types";
import { TRIGGERS, TRIGGER_LABELS } from "../utils/catalog";
import { summarizeWorkflow } from "../utils/summary";
import { validateWorkflow } from "../validators/workflow";
import { makeEmptyWorkflow, useWorkflows } from "../hooks/useWorkflows";
import { ConditionBuilder } from "./ConditionBuilder";
import { ActionBuilder } from "./ActionBuilder";
import { WorkflowSimulator } from "./WorkflowSimulator";

interface Props {
  initial?: WorkflowDefinition | null;
}

export function WorkflowEditor({ initial }: Props) {
  const nav = useNavigate();
  const { create, update } = useWorkflows();
  const [wf, setWf] = useState<WorkflowDefinition>(() => initial ?? makeEmptyWorkflow());
  const isNew = !initial;

  const errors = useMemo(() => validateWorkflow(wf), [wf]);
  const summary = useMemo(() => summarizeWorkflow(wf), [wf]);

  const patch = <K extends keyof WorkflowDefinition>(k: K, v: WorkflowDefinition[K]) =>
    setWf((prev) => ({ ...prev, [k]: v }));

  const onSave = async () => {
    if (errors.length) {
      toast.error("Revise os campos antes de salvar", { description: errors[0].message });
      return;
    }
    try {
      const saved = isNew ? await create(wf) : await update(wf);
      toast.success(isNew ? "Workflow criado" : "Workflow atualizado", {
        description: `Versão ${saved.version}`,
      });
      nav("/admin/workflows");
    } catch (err) {
      toast.error("Falha ao salvar", { description: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isNew ? "Novo workflow" : "Editar workflow"}</h1>
          <p className="text-sm text-muted-foreground">Monte a regra em etapas. Revise antes de salvar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Versão {wf.version}</Badge>
          <Button variant="outline" onClick={() => nav("/admin/workflows")}>Cancelar</Button>
          <Button onClick={onSave}>
            <Save className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4" /> Ajustes pendentes
          </div>
          <ul className="list-disc list-inside text-xs mt-1">
            {errors.slice(0, 5).map((e, i) => (<li key={i}>{e.message}</li>))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">1. Informações</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs md:col-span-2">
            <span className="text-muted-foreground">Nome</span>
            <Input value={wf.name} onChange={(e) => patch("name", e.target.value)} placeholder="Ex.: Escalar Bugs críticos" />
          </label>
          <label className="space-y-1 text-xs md:col-span-2">
            <span className="text-muted-foreground">Descrição</span>
            <Textarea rows={2} value={wf.description} onChange={(e) => patch("description", e.target.value)} placeholder="Para que serve?" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Categoria</span>
            <Input value={wf.category} onChange={(e) => patch("category", e.target.value)} />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Prioridade de execução (0-100)</span>
            <Input type="number" min={0} max={100} value={wf.priority} onChange={(e) => patch("priority", Number(e.target.value) || 0)} />
          </label>
          <label className="space-y-1 text-xs md:col-span-2">
            <span className="text-muted-foreground">Observações</span>
            <Textarea rows={2} value={wf.notes} onChange={(e) => patch("notes", e.target.value)} />
          </label>
          <div className="flex items-center gap-2 md:col-span-2">
            <Switch checked={wf.enabled} onCheckedChange={(v) => patch("enabled", v)} />
            <span className="text-sm">Ativo</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">2. Quando isso acontecer…</CardTitle></CardHeader>
        <CardContent>
          <Select value={wf.trigger} onValueChange={(v) => patch("trigger", v as WorkflowDefinition["trigger"])}>
            <SelectTrigger className="w-full md:w-96"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((t) => (<SelectItem key={t} value={t}>{TRIGGER_LABELS[t]}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Condições</CardTitle>
          <p className="text-xs text-muted-foreground">Combine com E, OU, NÃO. Você pode agrupar.</p>
        </CardHeader>
        <CardContent>
          <ConditionBuilder value={wf.conditions} onChange={(c) => patch("conditions", c)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. O que deve ser feito?</CardTitle>
          <p className="text-xs text-muted-foreground">As ações serão apenas configuradas — nada executa nesta etapa.</p>
        </CardHeader>
        <CardContent>
          <ActionBuilder value={wf.actions} onChange={(a) => patch("actions", a)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">5. Resumo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">{summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">6. Simulação</CardTitle></CardHeader>
        <CardContent>
          <WorkflowSimulator workflow={wf} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav("/admin/workflows")}>Cancelar</Button>
        <Button onClick={onSave}><Save className="h-4 w-4 mr-1" /> Salvar workflow</Button>
      </div>
    </div>
  );
}
