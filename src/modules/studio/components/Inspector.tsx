import { memo, useMemo, useState } from "react";
import type { StudioNode, StudioBinding, StudioDocument } from "../types";
import { findComponentSpec, type StudioPropSpec } from "../registry/components";
import { BINDING_KINDS, findBindingKind } from "../registry/bindings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Props {
  node: StudioNode | null;
  doc: StudioDocument;
  onUpdateProps: (id: string, props: Record<string, unknown>) => void;
  onUpdateStyle: (id: string, style: Record<string, string>) => void;
  onSetBinding: (id: string, prop: string, bindingId: string | null) => void;
  onUpsertBinding: (b: StudioBinding) => void;
  onRemoveBinding: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

function jsonSafeStringify(v: unknown): string {
  try {
    return JSON.stringify(v ?? null, null, 2);
  } catch {
    return "";
  }
}

function PropField({
  spec,
  value,
  boundId,
  bindings,
  onChange,
  onBind,
}: {
  spec: StudioPropSpec;
  value: unknown;
  boundId: string | null;
  bindings: Record<string, StudioBinding>;
  onChange: (v: unknown) => void;
  onBind: (bindingId: string | null) => void;
}) {
  const bindOptions = Object.values(bindings);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`prop-${spec.key}`} className="text-xs uppercase tracking-wide">
          {spec.label}
        </Label>
        {spec.bindable ? (
          <div className="flex items-center gap-1">
            <Select
              value={boundId ?? "__none__"}
              onValueChange={(v) => onBind(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue placeholder="Binding" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem binding</SelectItem>
                {bindOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.kind} · {b.target}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      {spec.kind === "text" ? (
        <Input
          id={`prop-${spec.key}`}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : spec.kind === "number" ? (
        <Input
          id={`prop-${spec.key}`}
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : spec.kind === "boolean" ? (
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      ) : spec.kind === "color" ? (
        <Input
          id={`prop-${spec.key}`}
          type="color"
          value={String(value ?? "#000000")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : spec.kind === "select" ? (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(spec.options ?? []).map((op) => (
              <SelectItem key={op} value={op}>
                {op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : spec.kind === "icon" ? (
        <Input
          id={`prop-${spec.key}`}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome do ícone (lucide)"
        />
      ) : (
        <Textarea
          id={`prop-${spec.key}`}
          value={jsonSafeStringify(value)}
          rows={4}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              /* mantém texto ao usuário até virar JSON válido */
            }
          }}
          className="font-mono text-xs"
        />
      )}
      {spec.help ? <p className="ds-caption text-muted-foreground">{spec.help}</p> : null}
    </div>
  );
}

function InspectorInner({
  node,
  doc,
  onUpdateProps,
  onUpdateStyle,
  onSetBinding,
  onUpsertBinding,
  onRemoveBinding,
  onDuplicate,
  onRemove,
}: Props) {
  const spec = node ? findComponentSpec(node.type) : null;
  const [newKind, setNewKind] = useState(BINDING_KINDS[0].kind);
  const [newTarget, setNewTarget] = useState("");

  const bindingList = useMemo(() => Object.values(doc.bindings), [doc.bindings]);

  if (!node || !spec) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Selecione um componente no canvas para editar suas propriedades.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <div>
          <p className="ds-h3">{spec.label}</p>
          <p className="ds-caption text-muted-foreground">{node.id}</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => onDuplicate(node.id)}>
            Duplicar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRemove(node.id)}>
            Remover
          </Button>
        </div>
      </div>
      <Tabs defaultValue="props" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="props">Props</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="bindings">Bindings</TabsTrigger>
        </TabsList>
        <TabsContent value="props" className="flex-1 overflow-auto p-3 space-y-3">
          {spec.props.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem props configuráveis.</p>
          ) : (
            spec.props.map((p) => (
              <PropField
                key={p.key}
                spec={p}
                value={node.props[p.key]}
                boundId={node.bindings?.[p.key] ?? null}
                bindings={doc.bindings}
                onChange={(v) => onUpdateProps(node.id, { [p.key]: v })}
                onBind={(bId) => onSetBinding(node.id, p.key, bId)}
              />
            ))
          )}
        </TabsContent>
        <TabsContent value="layout" className="flex-1 overflow-auto p-3 space-y-3">
          {(["padding", "margin", "width", "maxWidth", "fontSize", "fontWeight"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs uppercase tracking-wide">{k}</Label>
              <Input
                value={String(node.style?.[k] ?? "")}
                placeholder={`Ex.: ${k === "fontSize" ? "14px" : "8px"}`}
                onChange={(e) => onUpdateStyle(node.id, { [k]: e.target.value })}
              />
            </div>
          ))}
        </TabsContent>
        <TabsContent value="bindings" className="flex-1 overflow-auto p-3 space-y-4">
          <div className="space-y-2">
            <p className="ds-caption uppercase text-muted-foreground">Novo binding</p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-40">
                <Label className="text-xs">Kind</Label>
                <Select value={newKind} onValueChange={(v) => setNewKind(v as never)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BINDING_KINDS.map((b) => (
                      <SelectItem key={b.kind} value={b.kind}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-[2] min-w-40">
                <Label className="text-xs">Target</Label>
                <Input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder={findBindingKind(newKind)?.hint ?? ""}
                />
              </div>
              <Button
                size="sm"
                disabled={!newTarget.trim()}
                onClick={() => {
                  onUpsertBinding({
                    id: `b_${Math.random().toString(36).slice(2, 8)}`,
                    kind: newKind,
                    target: newTarget.trim(),
                  });
                  setNewTarget("");
                }}
              >
                Adicionar
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="ds-caption uppercase text-muted-foreground">Bindings do documento</p>
            {bindingList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem bindings.</p>
            ) : (
              bindingList.map((b) => (
                <div key={b.id} className="flex items-center gap-2 border rounded-md p-2">
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {b.kind}
                  </Badge>
                  <code className="text-xs flex-1 truncate">{b.target}</code>
                  <Button size="sm" variant="ghost" onClick={() => onRemoveBinding(b.id)}>
                    Remover
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Inspector = memo(InspectorInner);
