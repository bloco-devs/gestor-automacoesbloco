import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  createComentario,
  getCardById,
  listComentarios,
  updateCard,
} from "@/lib/atividades";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CardLabelsBotao, CardLabelsResumo } from "./card/CardLabels";
import { CardDueDateBotao, CardDueDateResumo } from "./card/CardDueDate";
import { CardChecklistBotao, CardChecklistCorpo } from "./card/CardChecklist";
import { CardMembersBotao, CardMembersResumo } from "./card/CardMembers";
import { CardAttachmentsBotao, CardAttachmentsCorpo } from "./card/CardAttachments";

/**
 * Modal de detalhe do cartão — estilo Trello.
 *
 * ESCOPO ATUAL
 * Título, descrição e comentários (tabelas de `atividades_*`), além dos módulos
 * isolados de Etiquetas, Datas, Checklists, Membros e Anexos.
 */


interface Props {
  cardId: string | null;
  boardId: string | null;
  onFechar: () => void;
}

export function CardDetailModal({ cardId, boardId, onFechar }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const cartao = useQuery({
    queryKey: ["atividades", "card", cardId],
    queryFn: () => getCardById(cardId as string),
    enabled: !!cardId,
  });

  const comentarios = useQuery({
    queryKey: ["atividades", "comentarios", cardId],
    queryFn: () => listComentarios(cardId as string),
    enabled: !!cardId,
  });

  const [titulo, setTitulo] = useState("");
  const [descValue, setDescValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [comentario, setComentario] = useState("");

  /**
   * Blindagem de unmount: o modal desmonta antes do PATCH terminar, então
   * guardamos cardId/título/descrição em refs para o auto-save no fechamento.
   */
  const cardIdRef = useRef<string | null>(null);
  const tituloRef = useRef("");
  const descRef = useRef("");
  const editandoDescRef = useRef(false);
  const originalRef = useRef<{ titulo: string; descricao: string }>({ titulo: "", descricao: "" });

  useEffect(() => {
    if (cardId) cardIdRef.current = cardId;
  }, [cardId]);
  useEffect(() => {
    tituloRef.current = titulo;
  }, [titulo]);
  useEffect(() => {
    descRef.current = descValue;
  }, [descValue]);
  useEffect(() => {
    editandoDescRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (cartao.data) {
      setTitulo(cartao.data.titulo);
      setDescValue(cartao.data.descricao ?? "");
      setIsEditing(false);
      originalRef.current = {
        titulo: cartao.data.titulo,
        descricao: cartao.data.descricao ?? "",
      };
    }
  }, [cartao.data]);

  const invalidar = (id: string) => {
    void qc.invalidateQueries({ queryKey: ["atividades", "card", id] });
    if (boardId) void qc.invalidateQueries({ queryKey: atividadesKeys.cards(boardId) });
  };

  const salvar = useMutation({
    mutationFn: (v: { id: string; patch: { titulo?: string; descricao?: string } }) =>
      updateCard(v.id, v.patch),
    onSuccess: (_d, v) => {
      if (v.patch.titulo !== undefined) originalRef.current.titulo = v.patch.titulo;
      if (v.patch.descricao !== undefined) originalRef.current.descricao = v.patch.descricao;
      invalidar(v.id);
    },
    onError: (e, v) => {
      console.error("[CardDetailModal] falha ao salvar cartão", { cardId: v.id, patch: v.patch, e });
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    },
  });

  const salvarMutate = salvar.mutate;

  /** Salva alterações pendentes usando as refs e só então fecha o modal. */
  const fecharComSalvamento = useCallback(() => {
    const id = cardIdRef.current;
    if (id) {
      const patch: { titulo?: string; descricao?: string } = {};
      const tituloLimpo = tituloRef.current.trim();
      if (tituloLimpo && tituloLimpo !== originalRef.current.titulo) patch.titulo = tituloLimpo;
      if (editandoDescRef.current && descRef.current !== originalRef.current.descricao) {
        patch.descricao = descRef.current;
      }
      if (Object.keys(patch).length > 0) salvarMutate({ id, patch });
    }
    onFechar();
  }, [onFechar, salvarMutate]);

  const comentar = useMutation({
    mutationFn: (texto: string) => {
      if (!user?.id) throw new Error("Faça login para comentar.");
      return createComentario({ cardId: cardId as string, texto, userId: user.id });
    },
    onSuccess: () => {
      setComentario("");
      void qc.invalidateQueries({ queryKey: ["atividades", "comentarios", cardId] });
    },
    onError: (e) => {
      console.error("[CardDetailModal] falha ao comentar", { cardId, e });
      toast.error("Não foi possível publicar o comentário.");
    },
  });

  return (
    <Dialog open={!!cardId} onOpenChange={(aberto) => !aberto && fecharComSalvamento()}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="sr-only">Detalhes do cartão</DialogTitle>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            onBlur={() => {
              const limpo = titulo.trim();
              const id = cardIdRef.current;
              if (id && limpo && limpo !== originalRef.current.titulo) {
                salvar.mutate({ id, patch: { titulo: limpo } });
              }
            }}
            aria-label="Título do cartão"
            className="h-auto border-0 bg-transparent px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
            placeholder="Título do cartão"
          />
        </DialogHeader>

        {cartao.isLoading ? (
          <div className="flex items-center justify-center py-16" role="status">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Carregando cartão…</span>
          </div>
        ) : (
          <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto p-5 md:grid-cols-4">
            {/* Coluna principal */}
            <div className="min-w-0 space-y-6 md:col-span-3">
              {cardId ? (
                <div className="flex flex-wrap items-center gap-2">
                  {cardId && <CardMembersResumo cardId={cardId} />}
                  {cardId && boardId && <CardLabelsResumo cardId={cardId} boardId={boardId} />}
                  <CardDueDateResumo
                    cardId={cardId}
                    boardId={boardId}
                    dataEntrega={cartao.data?.dataEntrega ?? null}
                  />
                </div>
              ) : null}


              <section>
                <h3 className="ds-body-strong mb-2 text-sm font-medium">Descrição</h3>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descValue}
                      onChange={(e) => setDescValue(e.target.value)}
                      rows={7}
                      autoFocus
                      placeholder="Adicione uma descrição mais detalhada…"
                      className="transition-all duration-300 ease-in-out"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={salvar.isPending}
                        onClick={() => {
                          salvar.mutate({ descricao: descValue });
                          setIsEditing(false);
                        }}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescValue(cartao.data?.descricao ?? "");
                          setIsEditing(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full rounded-md bg-muted/40 p-3 text-left text-sm transition-colors duration-300 ease-in-out hover:bg-muted"
                  >
                    {descValue ? (
                      <span className="whitespace-pre-wrap">{descValue}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Adicionar uma descrição mais detalhada…
                      </span>
                    )}
                  </button>
                )}
              </section>


              {cardId && <CardChecklistCorpo cardId={cardId} />}

              {cardId && <CardAttachmentsCorpo cardId={cardId} />}


              <Separator />

              <section>
                <h3 className="mb-2 text-sm font-medium">Atividade</h3>
                <div className="space-y-2">
                  <Textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={2}
                    placeholder="Escreva um comentário…"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!comentario.trim() || comentar.isPending}
                      onClick={() => comentar.mutate(comentario.trim())}
                    >
                      {comentar.isPending ? "Publicando…" : "Comentar"}
                    </Button>
                  </div>
                </div>

                <ul className="mt-4 space-y-3">
                  {(comentarios.data ?? []).map((c) => (
                    <li key={c.id} className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleString("pt-BR")}
                      </p>

                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.texto}</p>
                    </li>
                  ))}
                  {comentarios.data?.length === 0 && (
                    <li className="text-sm text-muted-foreground">Nenhum comentário ainda.</li>
                  )}
                </ul>
              </section>
            </div>

            {/* Barra lateral */}
            <aside className="space-y-2 md:col-span-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adicionar ao cartão
              </h3>
              {cardId && boardId && <CardLabelsBotao cardId={cardId} boardId={boardId} />}
              {cardId && <CardChecklistBotao cardId={cardId} />}
              {cardId && (
                <CardDueDateBotao
                  cardId={cardId}
                  boardId={boardId}
                  dataEntrega={cartao.data?.dataEntrega ?? null}
                />
              )}
              {cardId && <CardMembersBotao cardId={cardId} />}
              {cardId && <CardAttachmentsBotao cardId={cardId} boardId={boardId} />}

            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
