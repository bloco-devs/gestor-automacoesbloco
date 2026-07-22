import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, XCircle, Play } from "lucide-react";
import type { SimulationSample, WorkflowDefinition } from "../types";
import { simulateWorkflow } from "../utils/simulator";
import { ACTION_LABELS } from "../utils/catalog";
import { PRIORITY_META, STATUS_COLUMNS, TYPE_META } from "@/modules/demands/types";

interface Props {
  workflow: WorkflowDefinition;
}

export function WorkflowSimulator({ workflow }: Props) {
  const [sample, setSample] = useState<SimulationSample>({});
  const [ran, setRan] = useState(false);
  const result = useMemo(() => (ran ? simulateWorkflow(workflow, sample) : null), [ran, sample, workflow]);

  const update = <K extends keyof SimulationSample>(key: K, v: SimulationSample[K]) => {
    setSample((s) => ({ ...s, [key]: v }));
    setRan(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Preencha um exemplo de solicitação. A simulação mostra apenas o que aconteceria — nada é executado.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Tipo</span>
          <Select value={sample.type ?? ""} onValueChange={(v) => update("type", v as SimulationSample["type"])}>
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_META).map(([v, m]) => (<SelectItem key={v} value={v}>{m.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Prioridade</span>
          <Select value={sample.priority ?? ""} onValueChange={(v) => update("priority", v as SimulationSample["priority"])}>
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_META).map(([v, m]) => (<SelectItem key={v} value={v}>{m.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Status</span>
          <Select value={sample.status ?? ""} onValueChange={(v) => update("status", v as SimulationSample["status"])}>
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {STATUS_COLUMNS.map((s) => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">SLA</span>
          <Select value={sample.sla_status ?? ""} onValueChange={(v) => update("sla_status", v as SimulationSample["sla_status"])}>
            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_prazo">No prazo</SelectItem>
              <SelectItem value="atencao">Atenção</SelectItem>
              <SelectItem value="estourado">Estourado</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Sistema</span>
          <Input className="h-8" value={sample.system ?? ""} onChange={(e) => update("system", e.target.value)} />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Palavra-chave</span>
          <Input className="h-8" value={sample.keyword ?? ""} onChange={(e) => update("keyword", e.target.value)} />
        </label>
      </div>

      <Button type="button" size="sm" onClick={() => setRan(true)}>
        <Play className="h-3.5 w-3.5 mr-1" /> Simular
      </Button>

      {result && (
        <div className="rounded-md border border-border bg-card p-3 space-y-3">
          <div className={`flex items-center gap-2 text-sm font-medium ${result.matched ? "text-success" : "text-muted-foreground"}`}>
            {result.matched ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {result.matched ? "Condições atendidas" : "Condições NÃO atendidas"}
          </div>
          <div className="text-xs text-muted-foreground">
            <div>Atendidas: <strong className="text-foreground">{result.matchedNodes.length}</strong></div>
            <div>Não atendidas: <strong className="text-foreground">{result.unmatchedNodes.length}</strong></div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1">Ações que seriam executadas</div>
            {result.plannedActions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma — condições não bateram ou não há ações.</p>
            ) : (
              <ul className="text-xs space-y-1 list-disc list-inside">
                {result.plannedActions.map((a) => (<li key={a.id}>{ACTION_LABELS[a.type]}</li>))}
              </ul>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Nenhuma ação real foi executada.</p>
        </div>
      )}
    </div>
  );
}
