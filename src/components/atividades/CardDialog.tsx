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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AtividadeCard } from "@/lib/atividades";
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
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const NONE = "__none__";

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitulo(initial?.titulo ?? "");
      setDescricao(initial?.descricao ?? "");
      setResponsavelId(initial?.responsavelId ?? NONE);
      setSolucaoId(initial?.solucaoId ?? NONE);
    }
  }, [open, initial]);

  async function handleSave() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        responsavelId: responsavelId === NONE ? null : responsavelId,
        solucaoId: solucaoId === NONE ? null : solucaoId,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
              rows={4}
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
