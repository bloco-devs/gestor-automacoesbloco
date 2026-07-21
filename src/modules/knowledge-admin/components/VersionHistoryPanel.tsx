import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import { useArticleVersions, useRestoreVersion } from "../hooks/useArticleVersions";
import { MarkdownView } from "../utils/markdown";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function VersionHistoryPanel({ articleId }: { articleId: string }) {
  const { data: versions = [], isLoading } = useArticleVersions(articleId);
  const restore = useRestoreVersion();
  const [selected, setSelected] = useState<string | null>(null);
  const { toast } = useToast();
  const active = versions.find((v) => v.id === selected) ?? versions[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3 h-full">
      <ScrollArea className="h-[420px] rounded-md border">
        <ul className="divide-y">
          {isLoading && <li className="p-3 text-sm text-muted-foreground">Carregando…</li>}
          {!isLoading && versions.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Sem histórico ainda.</li>
          )}
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => setSelected(v.id)}
                className={`w-full text-left p-3 hover:bg-muted/50 ${active?.id === v.id ? "bg-muted" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">v{v.versao}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {v.resumo_alteracao ?? "—"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {v.changed_by_email ?? "sistema"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
      <div className="rounded-md border p-3 min-h-[420px] flex flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                {(active.snapshot as { titulo?: string })?.titulo ?? "(sem título)"} · v{active.versao}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={restore.isPending}
                onClick={() =>
                  restore
                    .mutateAsync({ articleId, versionId: active.id })
                    .then(() => toast({ title: "Versão restaurada" }))
                }
              >
                <RotateCcw className="size-3 mr-1" /> Restaurar esta versão
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <MarkdownView content={String((active.snapshot as { conteudo?: string })?.conteudo ?? "")} />
            </ScrollArea>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Selecione uma versão à esquerda.</div>
        )}
      </div>
    </div>
  );
}
