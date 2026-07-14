import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BoardVisibilidade } from "@/lib/atividadesBoards";

const COLORS = [
  "hsl(215 82% 55%)",
  "hsl(160 65% 40%)",
  "hsl(280 55% 55%)",
  "hsl(20 85% 55%)",
  "hsl(0 70% 55%)",
  "hsl(45 90% 50%)",
  "hsl(200 15% 45%)",
];

const ICONS = ["📋", "🚀", "🎯", "💡", "🛠️", "📊", "🧭", "🏗️"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  onSubmit: (data: {
    nome: string;
    descricao?: string;
    cor?: string;
    icone?: string;
    visibilidade: BoardVisibilidade;
    favoritar: boolean;
  }) => void | Promise<void>;
}

export function NovoQuadroDialog({ open, onOpenChange, submitting, onSubmit }: Props) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState<string>(COLORS[0]);
  const [icone, setIcone] = useState<string>(ICONS[0]);
  const [visibilidade, setVisibilidade] = useState<BoardVisibilidade>("workspace");
  const [favoritar, setFavoritar] = useState(false);

  function reset() {
    setNome("");
    setDescricao("");
    setCor(COLORS[0]);
    setIcone(ICONS[0]);
    setVisibilidade("workspace");
    setFavoritar(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    await onSubmit({
      nome: nome.trim(),
      descricao: descricao.trim() || undefined,
      cor,
      icone,
      visibilidade,
      favoritar,
    });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Novo Quadro</DialogTitle>
            <DialogDescription>
              Crie um novo Quadro. Ele começará com as colunas padrão (Backlog, A Fazer,
              Em Andamento, Em Revisão, Concluído).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Projeto Financeiro"
              autoFocus
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Do que se trata este quadro?"
              rows={2}
              maxLength={280}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                    className={`h-6 w-6 rounded-md border-2 transition ${
                      cor === c ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-1">
                {ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcone(i)}
                    className={`h-7 w-7 rounded-md border text-sm ${
                      icone === i ? "border-foreground bg-accent" : "border-border"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vis">Visibilidade</Label>
            <Select
              value={visibilidade}
              onValueChange={(v) => setVisibilidade(v as BoardVisibilidade)}
            >
              <SelectTrigger id="vis">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privado — só membros convidados</SelectItem>
                <SelectItem value="workspace">Workspace — todo o Grupo Bloco</SelectItem>
                <SelectItem value="public">Público — qualquer usuário logado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={favoritar}
              onChange={(e) => setFavoritar(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Adicionar aos favoritos
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !nome.trim()}>
              {submitting ? "Criando..." : "Criar quadro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
