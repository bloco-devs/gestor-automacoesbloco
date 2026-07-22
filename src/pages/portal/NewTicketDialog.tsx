import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import type { KnowledgeItem } from "@/modules/knowledge";
import { DuplicatePreventionPanel } from "@/components/portal/DuplicatePreventionPanel";
import { markDemandIgnoredSuggestion } from "@/modules/ecossistema";
import {
  useAddAttachment,
  useAutoRespondDemand,
  useCreateDemand,
  useRecordDeflection,
} from "@/modules/demands/hooks";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Portal do Solicitante — abertura simplificada de chamado com Deflexão por IA.
 *
 * Diferente do CreateDemandDialog (admin): NÃO expõe Tipo/Prioridade/Complexidade/Responsável.
 * A triagem técnica fica com o time interno. Solicitante só fornece título, sistema,
 * descrição e anexos. Durante a digitação, sugestões da Base de Conhecimento aparecem
 * como painel de auto-resolução.
 */
export function NewTicketDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateDemand();
  const addAtt = useAddAttachment();
  const autoRespond = useAutoRespondDemand();
  const recordDeflect = useRecordDeflection();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemId, setSystemId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [plataformas, setPlataformas] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("plataformas")
      .select("id, nome")
      .order("nome")
      .then(({ data }) => setPlataformas(data ?? []));
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSystemId("");
    setFiles([]);
  };

  const handleResolvedByKB = (item: KnowledgeItem | null) => {
    // Registra a deflexão para o dashboard (métricas de economia operacional).
    void recordDeflect.mutateAsync({
      articleId: item?.source === "article" ? item.id : null,
      queryText: deflectionQuery,
      origin: "portal",
    });
    toast({
      title: "Ótimo! 🎉",
      description: "Ficamos felizes em ajudar. Nenhum chamado precisou ser aberto.",
    });
    reset();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const demand = await create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
        system_id: systemId || null,
        type: "melhoria",
      });

      for (const file of files) {
        const path = `${demand.id}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("demand-attachments")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        await addAtt.mutateAsync({
          demandId: demand.id,
          file_url: path,
          file_type: file.type,
          file_name: file.name,
        });
      }

      toast({ title: "Chamado registrado!", description: "Você poderá acompanhá-lo no portal." });

      // Aciona Agente Autônomo IA Nível 1 (portal sempre cria sem responsável).
      void autoRespond.mutateAsync(demand.id);

      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : "Falha",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Consulta combinada usada pelo KnowledgeSuggestions
  const deflectionQuery = [title, description].filter(Boolean).join(" — ").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir um chamado</DialogTitle>
          <DialogDescription>
            Conte o que está acontecendo. Vamos tentar te ajudar antes mesmo de abrir o chamado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-title">Título *</Label>
            <Input
              id="p-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder='Ex.: "Não consigo acessar o sistema X"'
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Sistema relacionado</Label>
            <Select value={systemId || "none"} onValueChange={(v) => setSystemId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum / Não sei</SelectItem>
                {plataformas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="Descreva o que aconteceu, o que você já tentou e o que esperava…"
            />
          </div>

          {/* Deflexão por IA — reusa a Central de Soluções */}
          {deflectionQuery.length >= 20 && (
            <KnowledgeSuggestions
              query={deflectionQuery}
              origin="portal"
              onResolved={handleResolvedByKB}
              minChars={20}
            />
          )}

          <div className="space-y-2">
            <Label>Anexos (imagens, PDFs)</Label>
            <label className="flex items-center gap-2 border border-dashed border-border rounded-md px-3 py-4 cursor-pointer hover:bg-muted/40 transition-colors">
              <Upload className="size-4" />
              <span className="text-sm text-muted-foreground">
                Clique para adicionar arquivos
              </span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  setFiles((prev) => [...prev, ...list]);
                  e.target.value = "";
                }}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between text-xs rounded border border-border px-2 py-1"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${f.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar chamado"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
