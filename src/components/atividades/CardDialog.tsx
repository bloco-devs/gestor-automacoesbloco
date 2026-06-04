import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Link2 } from "lucide-react";
import type { AtividadeCard, ChecklistItem, CardLink } from "@/lib/atividades";
import type { AssignableUser, Solucao } from "@/lib/types";

export interface CardDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: AtividadeCard | null;
  defaultColunaId?: string;
  responsaveis: AssignableUser[];
  solucoes: Solucao[];
  onSubmit: (data: {
    titulo: string;
    descricao: string;
    responsavelId: string | null;
    solucaoId: string | null;
    checklist: ChecklistItem[];
    links: CardLink[];
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const NONE = "__none__";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function CardDialog({
  open,
  onOpenChange,
  initial,
  responsaveis,
  solucoes,
  onSubmit,
  onDelete,
}: CardDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>(NONE);
  const [solucaoId, setSolucaoId] = useState<string>(NONE);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [links, setLinks] = useState<CardLink[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(initial?.titulo ?? "");
      setDescricao(initial?.descricao ?? "");
      setResponsavelId(initial?.responsavelId ?? NONE);
      setSolucaoId(initial?.solucaoId ?? NONE);
      setChecklist(initial?.checklist ?? []);
      setLinks(initial?.links ?? []);
      setNovoItem("");
    }
  }, [open, initial]);

  function addChecklistItem() {
    const t = novoItem.trim();
    if (!t) return;
    setChecklist((c) => [...c, { id: uid(), texto: t, concluido: false }]);
    setNovoItem("");
  }

  function addLink() {
    setLinks((l) => [...l, { id: uid(), label: "", url: "" }]);
  }

  async function handleSave() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        responsavelId: responsavelId === NONE ? null : responsavelId,
        solucaoId: solucaoId === NONE ? null : solucaoId,
        checklist,
        links: links
          .map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() }))
          .filter((l) => l.url),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const concluidos = checklist.filter((c) => c.concluido).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar card" : "Novo card"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="card-titulo">Título</Label>
            <Input
              id="card-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ajustar fluxo de cadastro"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-desc">Descrição</Label>
            <Textarea
              id="card-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Detalhe a atividade..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem responsável</SelectItem>
                {responsaveis.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Solução vinculada (opcional)</Label>
            <Select value={solucaoId} onValueChange={setSolucaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem vínculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Sem vínculo</SelectItem>
                {solucoes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Checklist</Label>
              {checklist.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {concluidos}/{checklist.length}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={item.concluido}
                    onCheckedChange={(v) =>
                      setChecklist((c) =>
                        c.map((i) =>
                          i.id === item.id ? { ...i, concluido: v === true } : i,
                        ),
                      )
                    }
                  />
                  <Input
                    value={item.texto}
                    onChange={(e) =>
                      setChecklist((c) =>
                        c.map((i) =>
                          i.id === item.id ? { ...i, texto: e.target.value } : i,
                        ),
                      )
                    }
                    className="h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() =>
                      setChecklist((c) => c.filter((i) => i.id !== item.id))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={novoItem}
                onChange={(e) => setNovoItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Adicionar item..."
                className="h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Links / Botões</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLink}>
                <Plus className="size-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-1.5">
              {links.map((link) => (
                <div key={link.id} className="flex items-center gap-2">
                  <Link2 className="size-4 text-muted-foreground shrink-0" />
                  <Input
                    value={link.label}
                    onChange={(e) =>
                      setLinks((ls) =>
                        ls.map((l) =>
                          l.id === link.id ? { ...l, label: e.target.value } : l,
                        ),
                      )
                    }
                    placeholder="Rótulo"
                    className="h-8 w-32"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      setLinks((ls) =>
                        ls.map((l) =>
                          l.id === link.id ? { ...l, url: e.target.value } : l,
                        ),
                      )
                    }
                    placeholder="https://..."
                    className="h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setLinks((ls) => ls.filter((l) => l.id !== link.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {links.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum link adicionado.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          {initial && onDelete && (
            <Button
              variant="destructive"
              onClick={async () => {
                await onDelete();
                onOpenChange(false);
              }}
              className="mr-auto"
            >
              Excluir
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !titulo.trim()}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
