import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, GitBranch } from "lucide-react";
import type { Condition, ConditionField, ConditionGroup, ConditionNode, ConditionOperator, GroupOp } from "../types";
import { FIELD_LABELS, FIELDS, OPERATOR_LABELS, operatorsFor, valueOptionsFor } from "../utils/catalog";
import { uid } from "../utils/id";

interface Props {
  value: ConditionGroup;
  onChange: (next: ConditionGroup) => void;
}

function makeCondition(): Condition {
  return { id: uid("c"), kind: "condition", field: "type", operator: "eq", value: "" };
}
function makeGroup(op: GroupOp = "AND"): ConditionGroup {
  return { id: uid("g"), kind: "group", op, children: [] };
}

function replaceNode(root: ConditionGroup, targetId: string, updater: (n: ConditionNode) => ConditionNode | null): ConditionGroup {
  const walk = (n: ConditionNode): ConditionNode | null => {
    if (n.id === targetId) return updater(n);
    if (n.kind === "group") {
      const nextChildren = n.children.map(walk).filter((x): x is ConditionNode => x !== null);
      return { ...n, children: nextChildren };
    }
    return n;
  };
  const res = walk(root);
  return (res && res.kind === "group" ? res : root) as ConditionGroup;
}

function addChild(root: ConditionGroup, parentId: string, child: ConditionNode): ConditionGroup {
  return replaceNode(root, parentId, (n) =>
    n.kind === "group" ? { ...n, children: [...n.children, child] } : n,
  );
}

function ConditionRow({ node, onUpdate, onRemove }: { node: Condition; onUpdate: (n: Condition) => void; onRemove: () => void }) {
  const opts = valueOptionsFor(node.field);
  const ops = operatorsFor(node.field);
  const needsValue = node.operator !== "is_set" && node.operator !== "is_unset";
  const multi = node.operator === "in" || node.operator === "not_in";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
      <Select value={node.field} onValueChange={(v) => onUpdate({ ...node, field: v as ConditionField, value: "" })}>
        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {FIELDS.map((f) => (<SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={node.operator} onValueChange={(v) => onUpdate({ ...node, operator: v as ConditionOperator, value: multi ? [] : "" })}>
        <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ops.map((op) => (<SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>))}
        </SelectContent>
      </Select>
      {needsValue && opts && !multi && (
        <Select value={(node.value as string) || ""} onValueChange={(v) => onUpdate({ ...node, value: v })}>
          <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Escolha…" /></SelectTrigger>
          <SelectContent>
            {opts.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
          </SelectContent>
        </Select>
      )}
      {needsValue && opts && multi && (
        <Input
          className="h-8 w-64"
          placeholder="Ex.: alta, critica (separado por vírgula)"
          value={Array.isArray(node.value) ? (node.value as string[]).join(", ") : ""}
          onChange={(e) => onUpdate({ ...node, value: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      )}
      {needsValue && !opts && (
        <Input
          className="h-8 w-64"
          placeholder="Valor"
          value={(node.value as string) || ""}
          onChange={(e) => onUpdate({ ...node, value: e.target.value })}
        />
      )}
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function GroupNode({ node, root, onChange, depth = 0 }: { node: ConditionGroup; root: ConditionGroup; onChange: (n: ConditionGroup) => void; depth?: number }) {
  const update = (child: ConditionNode) => onChange(replaceNode(root, child.id, () => child));
  const remove = (id: string) => onChange(replaceNode(root, id, () => null) as ConditionGroup);

  return (
    <div className={`rounded-md border ${depth === 0 ? "border-transparent p-0" : "border-dashed border-border/70 p-2 bg-muted/30"} space-y-2`}>
      {depth > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          <Select value={node.op} onValueChange={(v) => onChange(replaceNode(root, node.id, (n) => (n.kind === "group" ? { ...n, op: v as GroupOp } : n)) as ConditionGroup)}>
            <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">Todas (E)</SelectItem>
              <SelectItem value="OR">Qualquer (OU)</SelectItem>
              <SelectItem value="NOT">Nenhuma (NÃO)</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 text-destructive" onClick={() => remove(node.id)}>Remover grupo</Button>
        </div>
      )}
      {node.children.map((c) => (
        <Fragment key={c.id}>
          {c.kind === "condition" ? (
            <ConditionRow node={c} onUpdate={update} onRemove={() => remove(c.id)} />
          ) : (
            <GroupNode node={c} root={root} onChange={onChange} depth={depth + 1} />
          )}
        </Fragment>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(addChild(root, node.id, makeCondition()))}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Condição
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(addChild(root, node.id, makeGroup("AND")))}>
          <GitBranch className="h-3.5 w-3.5 mr-1" /> Grupo
        </Button>
      </div>
    </div>
  );
}

export function ConditionBuilder({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Combinação geral:</span>
        <Select value={value.op} onValueChange={(v) => onChange({ ...value, op: v as GroupOp })}>
          <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">Todas (E)</SelectItem>
            <SelectItem value="OR">Qualquer (OU)</SelectItem>
            <SelectItem value="NOT">Nenhuma (NÃO)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <GroupNode node={value} root={value} onChange={onChange} />
    </div>
  );
}
