import { useState } from "react";
import { toast } from "sonner";
import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  createLabel,
  labelColorClass,
  labelColorStyle,
  LABEL_COLORS,
  type AtividadeLabel,
} from "@/lib/atividades";
import { cn } from "@/lib/utils";

export function LabelsPopover({
  labels,
  selected,
  boardId,
  onToggle,
  onCreated,
}: {
  labels: AtividadeLabel[];
  selected: string[];
  boardId: string | null;
  onToggle: (id: string) => void;
  onCreated: (l: AtividadeLabel) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("blue");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const n = nome.trim();
    if (!n || !boardId) return;
    setSaving(true);
    try {
      const l = await createLabel({ nome: n, cor, boardId });
      onCreated(l);
      setNome("");
      setCor("blue");
      setCreating(false);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar a etiqueta");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <Tag className="size-3.5" /> Etiquetas
          {selected.length > 0 && (
            <span className="rounded-full bg-accent text-accent-foreground text-[10px] px-1.5 tabular-nums ml-1">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="text-xs font-medium text-muted-foreground px-1 py-1">Etiquetas</div>
        <div className="max-h-56 overflow-y-auto space-y-1">
          {labels.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Nenhuma etiqueta criada.
            </div>
          )}
          {labels.map((l) => (
            <label
              key={l.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent/10 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(l.id)}
                onCheckedChange={() => onToggle(l.id)}
              />
              <span
                className={cn(
                  "flex-1 truncate px-2 py-0.5 rounded text-xs font-medium border",
                  labelColorClass(l.cor),
                )}
                style={labelColorStyle(l.cor)}
              >
                {l.nome}
              </span>
            </label>
          ))}
        </div>
        <div className="border-t border-border mt-2 pt-2">
          {creating ? (
            <div className="space-y-2">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da etiqueta"
                className="h-8"
              />
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCor(c.key)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium border transition-all",
                      labelColorClass(c.key),
                      cor === c.key && "ring-2 ring-offset-1 ring-accent",
                    )}
                    title={c.label}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={saving || !nome.trim() || !boardId}
                >
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => setCreating(true)}
              disabled={!boardId}
            >
              <Plus className="size-3.5" /> Nova etiqueta
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
