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
import { cn } from "@/lib/utils";
import type { IdentidadeDoProjeto } from "@/modules/demand-access";

/**
 * Um campo obrigatório, de propósito.
 *
 * O diálogo herdado de Atividades pedia nome, descrição, cor, ícone,
 * visibilidade e favorito antes de deixar criar qualquer coisa — seis decisões
 * para quem só quer um lugar onde colocar trabalho. Aqui o nome é a única coisa
 * exigida; cor e ícone ficam à mão porque o quadradinho do cabeçalho é o que
 * distingue um projeto de outro de longe, e já vêm com um padrão razoável
 * escolhido, então ninguém precisa parar para decidir.
 */

const CORES = [
  "hsl(215 82% 55%)",
  "hsl(160 65% 40%)",
  "hsl(280 55% 55%)",
  "hsl(20 85% 55%)",
  "hsl(0 70% 55%)",
  "hsl(45 90% 50%)",
  "hsl(200 15% 45%)",
];

const ICONES = ["📋", "🚀", "🎯", "💡", "🛠️", "📊", "🧭", "🏗️"];

export function NovoProjetoDialog({
  open,
  onOpenChange,
  salvando,
  onCriar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salvando?: boolean;
  onCriar: (nome: string, identidade: IdentidadeDoProjeto) => void | Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState<string>(CORES[0]);
  const [icone, setIcone] = useState<string>(ICONES[0]);

  // Reabrir com o texto da tentativa anterior confunde: parece que já existe
  // algo salvo. Zera ao fechar.
  useEffect(() => {
    if (!open) {
      setNome("");
      setCor(CORES[0]);
      setIcone(ICONES[0]);
    }
  }, [open]);

  const valido = nome.trim().length > 0;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    await onCriar(nome.trim(), { cor, icone });
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
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 text-base"
                style={{ backgroundColor: cor }}
              >
                {icone}
              </span>
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
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-1.5">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  aria-label={`Usar a cor ${c}`}
                  aria-pressed={cor === c}
                  className={cn(
                    "size-6 rounded-md border-2 transition-colors",
                    cor === c ? "border-foreground" : "border-transparent",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-1">
              {ICONES.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcone(i)}
                  aria-label={`Usar o ícone ${i}`}
                  aria-pressed={icone === i}
                  className={cn(
                    "size-7 rounded-md border text-sm transition-colors",
                    icone === i ? "border-foreground bg-accent" : "border-border",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
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
