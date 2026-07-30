import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Um campo só, de propósito.
 *
 * O diálogo herdado de Atividades pedia nome, descrição, cor, ícone,
 * visibilidade e favorito antes de deixar criar qualquer coisa — seis decisões
 * para quem só quer um lugar onde colocar trabalho. Cor e capa se escolhem
 * melhor depois, olhando a lista; visibilidade padrão de workspace é o que
 * quase todo projeto quer. Aqui pede-se a única coisa que não dá para inferir:
 * o nome.
 */
export function NovoProjetoDialog({
  open,
  onOpenChange,
  salvando,
  onCriar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salvando?: boolean;
  onCriar: (nome: string) => void | Promise<void>;
}) {
  const [nome, setNome] = useState("");

  // Reabrir com o texto da tentativa anterior confunde: parece que já existe
  // algo salvo. Zera ao fechar.
  useEffect(() => {
    if (!open) setNome("");
  }, [open]);

  const valido = nome.trim().length > 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    await onCriar(nome.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Criar quadro</DialogTitle>
            <DialogDescription>
              Ele nasce com as colunas A Fazer, Em Andamento e Concluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nome-do-quadro">Nome do quadro</Label>
            <Input
              id="nome-do-quadro"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Automações do Financeiro"
              maxLength={80}
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido || salvando}>
              {salvando ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
