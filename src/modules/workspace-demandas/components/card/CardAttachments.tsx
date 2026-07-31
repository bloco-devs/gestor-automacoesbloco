import { useRef } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteAnexo,
  getDownloadUrl,
  listAnexos,
  uploadAnexo,
  type AtividadeAnexo,
} from "@/lib/atividadesAnexos";

/**
 * Anexos do cartão — bucket privado `atividades-anexos` + tabela `atividades_anexos`.
 * Corpo = lista com download/remoção; Botão = gatilho de upload.
 */

const chave = (cardId: string) => ["atividades", "card", cardId, "anexos"] as const;

function tamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Imagem tem miniatura; o resto continua sendo uma linha com ícone. */
function ehImagem(a: AtividadeAnexo) {
  return a.mimeType.startsWith("image/");
}


export function CardAttachmentsCorpo({ cardId }: { cardId: string }) {
  const qc = useQueryClient();
  const anexos = useQuery({ queryKey: chave(cardId), queryFn: () => listAnexos(cardId) });

  const remover = useMutation({
    mutationFn: (a: AtividadeAnexo) => deleteAnexo(a),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chave(cardId) }),
    onError: (e) => {
      console.error("[CardAttachments] falha ao remover anexo", { cardId, e });
      toast.error("Não foi possível remover o anexo.");
    },
  });

  const abrir = async (a: AtividadeAnexo) => {
    try {
      const url = await getDownloadUrl(a);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("[CardAttachments] falha ao gerar link", { cardId, e });
      toast.error("Não foi possível abrir o arquivo.");
    }
  };

  /**
   * MINIATURAS — o bucket é privado, então não existe URL pública: cada
   * imagem ganha um link assinado próprio, com validade curta e re-uso via
   * cache do react-query.
   */
  const imagens = (anexos.data ?? []).filter(ehImagem);
  const previews = useQueries({
    queries: imagens.map((a) => ({
      queryKey: ["atividades", "anexo-preview", a.id] as const,
      queryFn: () => getDownloadUrl(a),
      staleTime: 4 * 60_000,
    })),
  });
  const urlPor = new Map<string, string>();
  imagens.forEach((a, i) => {
    const url = previews[i]?.data;
    if (typeof url === "string") urlPor.set(a.id, url);
  });

  if (anexos.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando anexos…
      </div>
    );
  }
  if ((anexos.data ?? []).length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-medium">Anexos</h3>
      <ul className="space-y-2">
        {(anexos.data ?? []).map((a) => {
          const preview = ehImagem(a) ? urlPor.get(a.id) : undefined;
          return (
            <li key={a.id} className="overflow-hidden rounded-lg border bg-muted/30">
              {preview && (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => void abrir(a)}
                  aria-label={`Abrir ${a.filename}`}
                >
                  <img
                    src={preview}
                    alt={a.filename}
                    loading="lazy"
                    className="h-32 w-full object-cover"
                  />
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-2 text-sm">
                <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{a.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {tamanho(a.sizeBytes)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Baixar ${a.filename}`}
                  onClick={() => void abrir(a)}
                >
                  <Download className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 hover:text-destructive"
                  aria-label={`Remover ${a.filename}`}
                  disabled={remover.isPending}
                  onClick={() => remover.mutate(a)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

    </section>
  );
}

export function CardAttachmentsBotao({
  cardId,
  boardId,
}: {
  cardId: string;
  boardId: string | null;
}) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const enviar = useMutation({
    mutationFn: async (arquivos: File[]) => {
      if (!boardId) throw new Error("Quadro não identificado.");
      for (const file of arquivos) {
        await uploadAnexo({ cardId, boardId, file });
      }
    },
    onSuccess: () => {
      toast.success("Anexo enviado.");
      void qc.invalidateQueries({ queryKey: chave(cardId) });
    },
    onError: (e) => {
      console.error("[CardAttachments] falha no upload", { cardId, boardId, e });
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    },
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const arquivos = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (arquivos.length > 0) enviar.mutate(arquivos);
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="justify-start"
        disabled={enviar.isPending || !boardId}
        onClick={() => inputRef.current?.click()}
      >
        {enviar.isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        ) : (
          <Paperclip className="mr-2 size-4" aria-hidden />
        )}
        {enviar.isPending ? "Enviando…" : "Anexos"}
      </Button>
    </>
  );
}
