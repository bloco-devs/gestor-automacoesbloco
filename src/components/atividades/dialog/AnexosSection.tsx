import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  File as FileIcon,
  FileImage,
  FileText,
  FileArchive,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { atividadesKeys } from "@/hooks/useAtividadesBoard";
import {
  deleteAnexo,
  getDownloadUrl,
  listAnexos,
  uploadAnexo,
  validateFile,
  MAX_PER_CARD,
  MAX_SIZE,
  type AtividadeAnexo,
} from "@/lib/atividadesAnexos";

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime === "application/zip") return FileArchive;
  if (mime.startsWith("text/") || mime === "application/pdf") return FileText;
  return FileIcon;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AnexosSection({
  cardId,
  boardId,
  canEdit = true,
}: {
  cardId: string;
  boardId: string;
  canEdit?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = atividadesKeys.anexos(cardId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const q = useQuery<AtividadeAnexo[]>({
    queryKey: key,
    queryFn: () => listAnexos(cardId),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (q.error) {
      console.error(q.error);
      toast.error("Não foi possível carregar os anexos");
    }
  }, [q.error]);

  const uploadM = useMutation({
    mutationFn: (file: File) => uploadAnexo({ cardId, boardId, file }),
    onSuccess: (created) => {
      qc.setQueryData<AtividadeAnexo[] | undefined>(key, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      qc.invalidateQueries({ queryKey: atividadesKeys.activity(cardId) });
      qc.invalidateQueries({ queryKey: atividadesKeys.anexosCounts() });
      toast.success("Anexo adicionado");
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Falha no upload";
      toast.error(msg);
    },
  });

  const delM = useMutation({
    mutationFn: (anexo: AtividadeAnexo) => deleteAnexo(anexo),
    onSuccess: (_r, anexo) => {
      qc.setQueryData<AtividadeAnexo[] | undefined>(key, (prev) =>
        prev?.filter((a) => a.id !== anexo.id),
      );
      qc.invalidateQueries({ queryKey: atividadesKeys.activity(cardId) });
      qc.invalidateQueries({ queryKey: atividadesKeys.anexosCounts() });
      toast.success("Anexo removido");
    },
    onError: (e: unknown) => {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Não foi possível remover";
      toast.error(msg);
    },
  });

  const items = q.data ?? [];
  const atLimit = items.length >= MAX_PER_CARD;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (items.length + 1 > MAX_PER_CARD) {
          toast.error(`Limite de ${MAX_PER_CARD} anexos por card`);
          break;
        }
        const err = validateFile(file);
        if (err) {
          toast.error(`${file.name}: ${err}`);
          continue;
        }
        await uploadM.mutateAsync(file);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDownload(anexo: AtividadeAnexo) {
    try {
      const url = await getDownloadUrl(anexo);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o link de download");
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-1.5">
          <Paperclip className="size-3.5" /> Anexos
        </Label>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}/{MAX_PER_CARD}
        </span>
      </div>

      {q.isLoading && <p className="text-xs text-muted-foreground">Carregando...</p>}
      {!q.isLoading && items.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum anexo ainda.</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((a) => {
            const Icon = iconFor(a.mimeType);
            const isMine = user?.id === a.uploadedBy;
            return (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" title={a.filename}>
                    {a.filename}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {humanSize(a.sizeBytes)} · {a.uploadedByEmail ?? "—"} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => handleDownload(a)}
                  aria-label="Baixar anexo"
                  title="Baixar"
                >
                  <Download className="size-3.5" />
                </Button>
                {canEdit && isMine && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => delM.mutate(a)}
                    disabled={delM.isPending}
                    aria-label="Remover anexo"
                    title="Remover"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="pt-1">
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || atLimit}
          >
            {uploading ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Upload className="size-3.5 mr-1.5" />
                {atLimit ? "Limite atingido" : "Adicionar anexo"}
              </>
            )}
          </Button>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Máx {(MAX_SIZE / 1024 / 1024).toFixed(0)} MB. Imagens, PDF, Office, texto ou ZIP.
          </p>
        </div>
      )}
    </div>
  );
}
