import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckSquare,
  Loader2,
  Paperclip,
  Tag,
  Users,
} from "lucide-react";
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

/**
 * Modal de detalhe do cartão — estilo Trello.
 *
 * ESCOPO DESTA ETAPA
 * A estrutura visual e os dois campos que já têm tabela: título e descrição
 * (em `atividades_cards`) e comentários (`atividades_comentarios`). A barra
 * lateral é deliberadamente inerte: membros, etiquetas, checklist, datas e
 * anexos ganham comportamento em etapas próprias, cada uma com sua tabela.
 * Botão desabilitado é mais honesto que botão que abre um popover vazio.
 */

const ACOES_LATERAIS = [
  { id: "membros", rotulo: "Membros", Icone: Users },
  { id: "etiquetas", rotulo: "Etiquetas", Icone: Tag },
  { id: "checklist", rotulo: "Checklist", Icone: CheckSquare },
  { id: "datas", rotulo: "Datas", Icone: CalendarDays },
  { id: "anexos", rotulo: "Anexos", Icone: Paperclip },
] as const;

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
  const [descricao, setDescricao] = useState("");
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    if (cartao.data) {
      setTitulo(cartao.data.titulo);
      setDescricao(cartao.data.descricao ?? "");
    }
  }, [cartao.data]);

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["atividades", "card", cardId] });
    if (boardId) void qc.invalidateQueries({ queryKey: atividadesKeys.cards(boardId) });
  };

  const salvar = useMutation({
    mutationFn: (patch: { titulo?: string; descricao?: string }) =>
      updateCard(cardId as string, patch),
    onSuccess: invalidar,
    onError: (e) => {
      console.error("[CardDetailModal] falha ao salvar cartão", { cardId, e });
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    },
  });

  const comentar = useMutation({
    mutationFn: (texto: string) =>
      createComentario({ cardId: cardId as string, texto, userId: user?.id ?? null }),
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
    <Dialog open={!!cardId} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-4xl gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="sr-only">Detalhes do cartão</DialogTitle>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              const limpo = titulo.trim();
              if (limpo && limpo !== cartao.data?.titulo) salvar.mutate({ titulo: limpo });
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
          <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto p-5 md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
            {/* Coluna principal */}
            <div className="min-w-0 space-y-6">
              <section>
                <h3 className="ds-body-strong mb-2 text-sm font-medium">Descrição</h3>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  onBlur={() => {
                    if (descricao !== (cartao.data?.descricao ?? "")) salvar.mutate({ descricao });
                  }}
                  rows={7}
                  placeholder="Adicione uma descrição mais detalhada…"
                />
              </section>

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
            <aside className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Adicionar ao cartão
              </h3>
              {ACOES_LATERAIS.map(({ id, rotulo, Icone }) => (
                <Button
                  key={id}
                  variant="outline"
                  size="sm"
                  disabled
                  title="Disponível em breve"
                  className="w-full justify-start"
                >
                  <Icone className="mr-2 size-4" aria-hidden />
                  {rotulo}
                </Button>
              ))}
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
