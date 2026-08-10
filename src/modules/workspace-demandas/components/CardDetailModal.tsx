import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlignLeft, CheckCircle2, Circle, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import {
  createComentario,
  deleteComentario,
  getCardById,
  listColunas,
  listComentarios,
  updateCard,
  updateComentario,
} from "@/lib/atividades";
import { tomDaEtapa } from "@/domain/demand";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { CardComentario } from "./card/CardComentario";

/**
 * Modal de detalhe do cartão — layout espelhando o Trello novo:
 * coluna principal (título, ações, descrição, checklists, anexos) + lateral
 * dedicada a comentários e atividade.
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

  const colunas = useQuery({
    queryKey: ["atividades", "colunas", boardId],
    queryFn: () => listColunas(boardId as string),
    enabled: !!boardId,
    staleTime: 5 * 60_000,
  });

  const nomeDaColuna =
    (colunas.data ?? []).find((c) => c.id === cartao.data?.colunaId)?.nome ?? null;

  /**
   * A coluna de "Concluído" não é um campo do banco: o tom vem do NOME da
   * etapa (`tomDaEtapa`), a mesma regra que o board usa para pintar a coluna.
   */
  const colunaConcluida =
    (colunas.data ?? []).find((c) => tomDaEtapa(c.nome) === "concluido") ?? null;
  const estaConcluido =
    !!cartao.data &&
    (cartao.data.concluido === true ||
      (!!colunaConcluida && cartao.data.colunaId === colunaConcluida.id));

  const comentarios = useQuery({
    queryKey: ["atividades", "comentarios", cardId],
    queryFn: () => listComentarios(cardId as string),
    enabled: !!cardId,
  });

  const [titulo, setTitulo] = useState("");
  const [descValue, setDescValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [comentario, setComentario] = useState("");
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

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

  /**
   * Editar e excluir o próprio comentário — a mesma regra do fio da demanda:
   * quem escreveu pode corrigir e apagar, mais ninguém. O erro é dito em voz
   * alta porque a política do banco pode recusar o que a tela permitiu.
   */
  const editarComentario = useCallback(
    async (id: string, texto: string) => {
      try {
        await updateComentario(id, texto);
        await qc.invalidateQueries({ queryKey: ["atividades", "comentarios", cardId] });
      } catch (e) {
        console.error("[CardDetailModal] falha ao editar comentário", { id, e });
        toast.error("Não foi possível editar o comentário.");
      }
    },
    [cardId, qc],
  );

  const excluirComentario = useCallback(
    async (id: string) => {
      try {
        await deleteComentario(id);
        await qc.invalidateQueries({ queryKey: ["atividades", "comentarios", cardId] });
      } catch (e) {
        console.error("[CardDetailModal] falha ao excluir comentário", { id, e });
        toast.error("Não foi possível excluir o comentário.");
      }
    },
    [cardId, qc],
  );



  /**
   * Concluir = mover para a coluna de conclusão (e marcar o campo `concluido`,
   * que é o que a capa do cartão lê). Reabrir desfaz apenas o campo: devolver
   * o cartão para uma coluna anterior é decisão de quem trabalha nele.
   */
  const concluir = useMutation({
    mutationFn: async (marcar: boolean) => {
      const id = cardIdRef.current;
      if (!id) return;
      await updateCard(id, {
        concluido: marcar,
        ...(marcar && colunaConcluida && colunaConcluida.id !== cartao.data?.colunaId
          ? { colunaId: colunaConcluida.id }
          : {}),
      });
    },
    onSuccess: () => {
      const id = cardIdRef.current;
      if (id) invalidar(id);
    },
    onError: (e) => {
      console.error("[CardDetailModal] falha ao concluir cartão", { cardId, e });
      toast.error("Não foi possível concluir o cartão.");
    },
  });

  return (
    <Dialog open={!!cardId} onOpenChange={(aberto) => !aberto && fecharComSalvamento()}>
      <DialogContent data-testid="card-detail-modal" className="max-w-5xl gap-0 p-0">
        <DialogHeader className="space-y-2 border-b px-6 py-5">
          <DialogTitle className="sr-only">Detalhes do cartão</DialogTitle>
          {nomeDaColuna ? (
            <span className="inline-flex w-fit items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              {nomeDaColuna}
            </span>
          ) : null}
          <div className="flex items-start gap-3">
            <button
              type="button"
              disabled={concluir.isPending}
              onClick={() => concluir.mutate(!estaConcluido)}
              data-testid="modal-concluir"
              data-concluida={estaConcluido ? "true" : "false"}
              title={estaConcluido ? "Reabrir cartão" : "Marcar como concluído"}
              aria-label={estaConcluido ? "Reabrir cartão" : "Marcar como concluído"}
              aria-pressed={estaConcluido}
              className="mt-1.5 shrink-0 rounded-full p-0.5 transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-progress disabled:opacity-60"
            >
              {estaConcluido ? (
                <CheckCircle2 className="size-5 text-success" aria-hidden />
              ) : (
                <Circle className="size-5 text-muted-foreground transition-colors duration-200 hover:text-foreground" aria-hidden />
              )}
            </button>

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
              className="h-auto border-0 bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
              placeholder="Título do cartão"
            />
          </div>
        </DialogHeader>

        {cartao.isLoading ? (
          <div className="flex items-center justify-center py-16" role="status">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            <span className="sr-only">Carregando cartão…</span>
          </div>
        ) : (
          <div className="grid max-h-[70vh] grid-cols-1 gap-8 overflow-y-auto p-6 md:grid-cols-5">
            {/* Coluna principal */}
            <div className="min-w-0 space-y-6 md:col-span-3">
              {/* Linha de ações */}
              <div className="mt-0 flex flex-row flex-wrap gap-2">
                {cardId && <CardMembersBotao cardId={cardId} />}
                {cardId && boardId && <CardLabelsBotao cardId={cardId} boardId={boardId} />}
                {cardId && (
                  <CardDueDateBotao
                    cardId={cardId}
                    boardId={boardId}
                    dataEntrega={cartao.data?.dataEntrega ?? null}
                  />
                )}
                {cardId && <CardChecklistBotao cardId={cardId} />}
                {cardId && <CardAttachmentsBotao cardId={cardId} boardId={boardId} />}
              </div>

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
                <h3 className="ds-body-strong mb-2 flex items-center gap-2 text-sm font-medium">
                  <AlignLeft className="size-4 text-muted-foreground" aria-hidden />
                  Descrição
                </h3>
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
                          const id = cardIdRef.current;
                          if (id && descValue !== originalRef.current.descricao) {
                            salvar.mutate({ id, patch: { descricao: descValue } });
                          }
                          setIsEditing(false);
                        }}
                      >
                        Salvar
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
            </div>

            {/* Lateral: comentários e atividade */}
            <aside className="min-w-0 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="size-4 text-muted-foreground" aria-hidden />
                  Comentários e atividade
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => setMostrarDetalhes((v) => !v)}
                >
                  {mostrarDetalhes ? "Ocultar detalhes" : "Mostrar detalhes"}
                </Button>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Escrever um comentário…"
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

              <Separator />

              <ul className="space-y-3">
                {(comentarios.data ?? []).map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <Avatar className="size-7 shrink-0">
                      {/* A foto quando existe; a inicial só como último recurso. */}
                      {c.autorAvatarUrl ? (
                        <AvatarImage src={c.autorAvatarUrl} alt={c.autorNome ?? "Autor"} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {(c.autorNome ?? "?").trim().slice(0, 1).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 rounded-lg border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        {c.autorNome ? <span className="font-medium text-foreground">{c.autorNome}</span> : null}
                        {c.autorNome ? " · " : null}
                        {new Date(c.createdAt).toLocaleString("pt-BR")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{c.texto}</p>

                    </div>
                  </li>
                ))}
                {comentarios.data?.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhum comentário ainda.</li>
                )}
              </ul>

              {mostrarDetalhes && (
                <ul className="space-y-3 border-t pt-3">
                  <li className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="size-6 shrink-0">
                      {/* Fallback só quando não há foto — a inicial é o último recurso. */}
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.nome ?? user.email ?? "Autor"} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {(user?.nome ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      adicionou este cartão a {nomeDaColuna ?? "esta coluna"}
                    </span>
                  </li>
                </ul>
              )}
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
