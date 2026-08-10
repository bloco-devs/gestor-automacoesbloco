import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { CardComentario as Comentario } from "@/lib/atividades";

/**
 * Um comentário do cartão — a mesma gramática do fio da demanda.
 *
 * Lápis e lixeira só aparecem no hover (e no foco por teclado) e só para quem
 * escreveu: ações visíveis em toda linha transformam a conversa numa planilha,
 * e ações em mensagem de outra pessoa são um botão que o banco vai recusar.
 */
export function CardComentario({
  comentario,
  podeAgir,
  onEditar,
  onExcluir,
}: {
  comentario: Comentario;
  podeAgir: boolean;
  onEditar: (id: string, texto: string) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(comentario.texto);
  const [salvando, setSalvando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const editado = comentario.updatedAt !== comentario.createdAt;

  const salvar = async () => {
    const t = rascunho.trim();
    if (!t || salvando) return;
    setSalvando(true);
    try {
      await onEditar(comentario.id, t);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <li className="group/comentario flex gap-2">
      <Avatar className="size-7 shrink-0">
        {comentario.autorAvatarUrl ? (
          <AvatarImage src={comentario.autorAvatarUrl} alt={comentario.autorNome ?? "Autor"} />
        ) : null}
        <AvatarFallback className="text-[10px]">
          {(comentario.autorNome ?? "?").trim().slice(0, 1).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-baseline gap-2">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {comentario.autorNome ? (
              <span className="font-medium text-foreground">{comentario.autorNome}</span>
            ) : null}
            {comentario.autorNome ? " · " : null}
            {new Date(comentario.createdAt).toLocaleString("pt-BR")}
            {editado ? " · editado" : ""}
          </p>

          {podeAgir && !editando && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity",
                "group-hover/comentario:opacity-100 focus-within:opacity-100",
              )}
            >
              <button
                type="button"
                aria-label="Editar comentário"
                title="Editar"
                onClick={() => {
                  setRascunho(comentario.texto);
                  setEditando(true);
                }}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Pencil className="size-3" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Excluir comentário"
                title="Excluir"
                onClick={() => setConfirmando(true)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Trash2 className="size-3" aria-hidden />
              </button>
            </span>
          )}
        </div>

        {editando ? (
          <div className="mt-2 space-y-1.5">
            <Textarea
              value={rascunho}
              autoFocus
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void salvar();
                }
                if (e.key === "Escape") setEditando(false);
              }}
              aria-label="Editar o texto do comentário"
              className="min-h-[64px] resize-none text-sm"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={!rascunho.trim() || salvando}
                onClick={() => void salvar()}
              >
                {salvando ? <Loader2 className="size-3 animate-spin" aria-hidden /> : "Salvar"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm">{comentario.texto}</p>
        )}
      </div>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Ele sai do cartão para todos. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onExcluir(comentario.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
