import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
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
  useAutoRespondDemand,
  useCreateDemand,
  useRecordDeflection,
} from "@/modules/demands/hooks";
import { ACEITA_NO_SELETOR, enviarVarios, validarArquivo } from "@/modules/demands/anexos";
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
  const autoRespond = useAutoRespondDemand();
  const recordDeflect = useRecordDeflection();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [systemId, setSystemId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgedSuggestions, setAcknowledgedSuggestions] = useState(false);

  /**
   * Mesmo conserto do diálogo da equipe: o seletor passa a oferecer o catálogo
   * do HUB, cujo `id` é o slug, e o slug passa a ser gravado.
   *
   * Aqui pesa mais, porque este é o formulário do SOLICITANTE. Toda demanda
   * aberta pelo portal nascia como `REQ-` e ficava fora do relatório por
   * sistema — justamente as demandas de quem não conversa com o Blink.
   */
  const { sistemas, loading: carregandoSistemas } = useEcossistemaSistemas(open);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSystemId("");
    setFiles([]);
    setAcknowledgedSuggestions(false);
  };

  // Reset ack ao mudar o texto substancialmente (nova rodada de sugestões).
  useEffect(() => {
    setAcknowledgedSuggestions(false);
  }, [description, title]);

  const handleResolvedByKB = (item: KnowledgeItem | null) => {
    // Registra a deflexão para o dashboard (métricas de economia operacional).
    void recordDeflect.mutateAsync({
      articleId: item?.source === "article" ? item.id : null,
      queryText: deflectionQuery,
      origin: "portal",
    });
    toast({
      title: "Ótimo! 🎉",
      description: "Ficamos felizes em ajudar. Nenhuma demanda precisou ser aberta.",
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
        sistema_slug: systemId || null,
        type: "melhoria",
      });

      // Marca a demanda como "criada apesar da sugestão" para o badge do Workspace.
      if (acknowledgedSuggestions && demand?.id) {
        markDemandIgnoredSuggestion(demand.id);
      }

      /**
       * O ANEXO NÃO PODE DERRUBAR A DEMANDA
       *
       * Antes, um `throw` no upload abortava o `handleSubmit` DEPOIS de a
       * demanda já estar criada: o usuário via "Erro ao enviar", o diálogo não
       * fechava, ele tentava de novo — e abria a segunda demanda idêntica. A
       * demanda existe; o que falhou foi o anexo, e é isso que a mensagem diz.
       */
      const { anexados, falhas } = await enviarVarios(demand.id, files);

      toast({
        title: "Demanda registrada!",
        description:
          falhas.length > 0
            ? `${anexados} de ${files.length} anexos enviados. ${falhas[0]} Você pode reenviar pela tela da demanda.`
            : "Você poderá acompanhá-la no portal.",
        variant: falhas.length > 0 ? "destructive" : undefined,
      });

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
          <DialogTitle>Nova demanda</DialogTitle>
          <DialogDescription>
            Conte o que está acontecendo. Vamos tentar te ajudar antes mesmo de abrir a demanda.
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
                <SelectValue placeholder={carregandoSistemas ? "Carregando…" : "Selecionar"} />
              </SelectTrigger>
              <SelectContent>
                {/* "Não sei" continua sendo uma resposta legítima — o
                    solicitante não tem obrigação de conhecer a divisão interna
                    dos sistemas. Forçar uma escolha aqui produziria chute, que
                    é pior que a ausência: chute parece dado. */}
                <SelectItem value="none">Não sei dizer</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
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

          {/* Prevenção de duplicatas — F018.1. Consolida sistemas + artigos + chamados. */}
          <DuplicatePreventionPanel
            titulo={title}
            descricao={description}
            enabled={description.trim().length >= 30}
            onContinueAnyway={() => setAcknowledgedSuggestions(true)}
            onResolved={() => {
              reset();
              onOpenChange(false);
            }}
          />

          {/* Fallback leve para descrições curtas — mantém o comportamento original. */}
          {description.trim().length < 30 && deflectionQuery.length >= 20 && (
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
                accept={ACEITA_NO_SELETOR}
                className="hidden"
                onChange={(e) => {
                  // Recusar aqui, e não depois do envio: o tamanho e o tipo já
                  // são conhecidos no instante da escolha, e descobrir que o
                  // arquivo não serve só ao apertar "Enviar demanda" é perder a
                  // demanda inteira por causa de um anexo.
                  const escolhidos = Array.from(e.target.files ?? []);
                  const bons: File[] = [];
                  for (const f of escolhidos) {
                    const problema = validarArquivo(f);
                    if (problema) toast({ title: problema, variant: "destructive" });
                    else bons.push(f);
                  }
                  setFiles((prev) => [...prev, ...bons]);
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
                "Enviar demanda"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
