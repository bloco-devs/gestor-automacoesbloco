import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createComentario,
  deleteComentario,
  listComentarios,
  updateComentario,
  type CardComentario,
} from "@/lib/atividades";
import { useAuth } from "@/hooks/useAuth";
import type { AssignableUser } from "@/lib/types";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { formatDateTime } from "./AtividadeTimeline";

export function ComentariosSection({
  cardId,
  responsaveis,
}: {
  cardId: string;
  responsaveis: AssignableUser[];
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = atividadesKeys.comentarios(cardId);

  const q = useQuery<CardComentario[]>({
    queryKey: key,
    queryFn: () => listComentarios(cardId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (q.error) {
      console.error(q.error);
      toast.error("Não foi possível carregar os comentários");
    }
  }, [q.error]);

  const [novo, setNovo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const nomeMap = useMemo(
    () => new Map(responsaveis.map((u) => [u.id, u.nome])),
    [responsaveis],
  );

  const addM = useMutation({
    mutationFn: (texto: string) =>
      createComentario({ cardId, userId: user!.id, texto }),
    onSuccess: (created) => {
      qc.setQueryData<CardComentario[] | undefined>(key, (prev) =>
        prev ? [...prev, created] : [created],
      );
      setNovo("");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível enviar o comentário");
    },
  });

  const editM = useMutation({
    mutationFn: (v: { id: string; texto: string }) => updateComentario(v.id, v.texto),
    onSuccess: (_r, v) => {
      qc.setQueryData<CardComentario[] | undefined>(key, (prev) =>
        prev?.map((c) =>
          c.id === v.id ? { ...c, texto: v.texto, updatedAt: new Date().toISOString() } : c,
        ),
      );
      setEditingId(null);
      setEditingText("");
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível editar o comentário");
    },
  });

  const delM = useMutation({
    mutationFn: (id: string) => deleteComentario(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<CardComentario[] | undefined>(key, (prev) =>
        prev?.filter((c) => c.id !== id),
      );
    },
    onError: (e) => {
      console.error(e);
      toast.error("Não foi possível excluir o comentário");
    },
  });

  const items = q.data ?? [];

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Comentários</Label>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
        )}
      </div>

      <div className="space-y-2">
        {q.isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
        {!q.isLoading && items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
        )}
        {items.map((c) => {
          const nome =
            (c.userId && nomeMap.get(c.userId)) ||
            (c.userId === user?.id ? "Você" : "Usuário");
          const isMine = c.userId && c.userId === user?.id;
          const isEditing = editingId === c.id;
          return (
            <div
              key={c.id}
              className="rounded-md border border-border/60 bg-muted/30 p-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="text-xs font-medium">
                  {nome}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {formatDateTime(c.createdAt)}
                    {c.updatedAt !== c.createdAt && " (editado)"}
                  </span>
                </div>
                {isMine && !isEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditingText(c.texto);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => delM.mutate(c.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditingText("");
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        editM.mutate({ id: c.id, texto: editingText.trim() })
                      }
                      disabled={!editingText.trim() || editM.isPending}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-snug">{c.texto}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Escreva um comentário..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => addM.mutate(novo.trim())}
            disabled={addM.isPending || !novo.trim() || !user?.id}
          >
            {addM.isPending ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
