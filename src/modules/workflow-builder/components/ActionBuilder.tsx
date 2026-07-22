import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import type { ActionType, WorkflowAction } from "../types";
import { ACTIONS, ACTION_HINTS, ACTION_LABELS } from "../utils/catalog";
import { uid } from "../utils/id";

interface Props {
  value: WorkflowAction[];
  onChange: (next: WorkflowAction[]) => void;
}

function paramFields(t: ActionType): { key: string; label: string; placeholder?: string }[] {
  switch (t) {
    case "set_priority":
      return [{ key: "priority", label: "Nova prioridade", placeholder: "baixa | media | alta | critica" }];
    case "set_assignee":
      return [{ key: "user", label: "Responsável", placeholder: "e-mail ou nome" }];
    case "add_comment":
      return [{ key: "text", label: "Mensagem" }];
    case "create_task":
      return [{ key: "title", label: "Título da atividade" }];
    case "relate_knowledge_article":
      return [{ key: "query", label: "Termo de busca do artigo" }];
    case "send_notification":
      return [
        { key: "to", label: "Destinatário", placeholder: "e-mail, equipe ou @responsavel" },
        { key: "message", label: "Mensagem" },
      ];
    case "log_audit":
      return [{ key: "event", label: "Descrição do evento" }];
    case "run_smart_routing":
    case "refresh_inbox":
    default:
      return [];
  }
}

export function ActionBuilder({ value, onChange }: Props) {
  const add = () => onChange([...value, { id: uid("a"), type: "run_smart_routing", params: {} }]);
  const update = (id: string, patch: Partial<WorkflowAction>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...patch, params: { ...a.params, ...(patch.params ?? {}) } } : a)));
  const remove = (id: string) => onChange(value.filter((a) => a.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const i = value.findIndex((a) => a.id === id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nenhuma ação configurada ainda.
        </div>
      )}
      {value.map((a, idx) => {
        const fields = paramFields(a.type);
        return (
          <div key={a.id} className="rounded-md border border-border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground w-6">{idx + 1}.</span>
              <Select value={a.type} onValueChange={(v) => update(a.id, { type: v as ActionType, params: {} })}>
                <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((t) => (<SelectItem key={t} value={t}>{ACTION_LABELS[t]}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(a.id, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => move(a.id, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{ACTION_HINTS[a.type]}</p>
            {fields.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {fields.map((f) => (
                  <label key={f.key} className="space-y-1 text-xs text-muted-foreground">
                    <span>{f.label}</span>
                    <Input
                      className="h-8"
                      placeholder={f.placeholder}
                      value={(a.params[f.key] as string) ?? ""}
                      onChange={(e) => update(a.id, { params: { [f.key]: e.target.value } })}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar ação
      </Button>
    </div>
  );
}
