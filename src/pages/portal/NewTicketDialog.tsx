import { useState } from "react";
import { Loader2, MessageCircle, Upload, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  formatarTelefoneBR,
  getWhatsapp,
  normalizarTelefoneBR,
  salvarWhatsapp,
} from "@/modules/notificacao-whatsapp";

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
   * ACOMPANHAR PELO WHATSAPP
   *
   * A preferência é da PESSOA, não da demanda: vale para todas as solicitações
   * dela, e é a mesma que aparece em Preferências. Por isso a caixa já vem
   * marcada para quem já aceitou antes, e o texto diz que vale para todas.
   *
   * `whatsSalvo` guarda o que está no banco, para gravar só se mudou.
   */
  const [acompanharWhats, setAcompanharWhats] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [whatsSalvo, setWhatsSalvo] = useState<{ ativo: boolean; telefone: string | null }>({
    ativo: false,
    telefone: null,
  });

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    getWhatsapp()
      .then((w) => {
        if (!vivo) return;
        setWhatsSalvo({ ativo: w.whatsapp_ativo, telefone: w.whatsapp_telefone });
        setAcompanharWhats(w.whatsapp_ativo);
        setTelefone(w.whatsapp_telefone ? formatarTelefoneBR(w.whatsapp_telefone) : "");
      })
      .catch(() => {
        /* sem preferência legível: a caixa começa desmarcada, que é o padrão */
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  const telefoneNormalizado = normalizarTelefoneBR(telefone);
  const telefoneInvalido = acompanharWhats && telefone.trim() !== "" && !telefoneNormalizado;

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
    // Pediu WhatsApp com número que não serve: para AQUI, antes de criar.
    // Depois de criada, a pessoa descobriria que não vai receber nada só
    // quando o primeiro aviso não chegasse.
    if (acompanharWhats && !telefoneNormalizado) {
      toast({
        title: "Confira o número do WhatsApp",
        description: "Use DDD + número, por exemplo (11) 98765-4321.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      /**
       * A PREFERÊNCIA ANTES DA DEMANDA, e sem poder derrubá-la.
       *
       * Antes, porque o recibo sai do trigger de INSERT em `demands`: gravada
       * depois, o trigger roda sem saber do aceite e o "recebi sua
       * solicitação" nunca é enviado.
       *
       * Sem derrubar, pela mesma regra dos anexos logo abaixo: a demanda é o
       * que a pessoa veio fazer. Se o WhatsApp falhar, ela é criada do mesmo
       * jeito e o aviso diz o que não deu certo.
       */
      let avisoWhats: string | null = null;
      const mudouWhats =
        acompanharWhats !== whatsSalvo.ativo ||
        (acompanharWhats && telefoneNormalizado !== whatsSalvo.telefone);
      if (mudouWhats) {
        try {
          await salvarWhatsapp({ ativo: acompanharWhats, telefone: telefoneNormalizado });
          setWhatsSalvo({ ativo: acompanharWhats, telefone: telefoneNormalizado });
        } catch {
          avisoWhats = acompanharWhats
            ? "Não consegui ativar os avisos por WhatsApp — tente de novo em Preferências."
            : "Não consegui desligar os avisos por WhatsApp — tente de novo em Preferências.";
        }
      }

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
        description: [
          falhas.length > 0
            ? `${anexados} de ${files.length} anexos enviados. ${falhas[0]} Você pode reenviar pela tela da demanda.`
            : acompanharWhats && !avisoWhats
              ? "O Blink vai te avisar pelo WhatsApp a cada etapa."
              : "Você poderá acompanhá-la no portal.",
          avisoWhats,
        ]
          .filter(Boolean)
          .join(" "),
        variant: falhas.length > 0 || avisoWhats ? "destructive" : undefined,
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

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="p-whats"
                checked={acompanharWhats}
                onCheckedChange={(v) => setAcompanharWhats(v === true)}
                disabled={submitting}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="p-whats" className="flex items-center gap-1.5 cursor-pointer">
                  <MessageCircle className="size-4" aria-hidden />
                  Acompanhar pelo WhatsApp
                </Label>
                <p className="text-xs text-muted-foreground">
                  O Blink te avisa cada vez que a solicitação muda de etapa, até a conclusão.
                  Vale para todas as suas solicitações, e você desliga quando quiser em Preferências.
                </p>
              </div>
            </div>
            {acompanharWhats && (
              <div className="space-y-1 pl-6">
                <Label htmlFor="p-telefone" className="text-xs">
                  Número do WhatsApp
                </Label>
                <Input
                  id="p-telefone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 98765-4321"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  onBlur={() => telefoneNormalizado && setTelefone(formatarTelefoneBR(telefoneNormalizado))}
                  aria-invalid={telefoneInvalido || undefined}
                  disabled={submitting}
                />
                {telefoneInvalido && (
                  <p className="text-xs text-destructive">Use DDD + número, por exemplo (11) 98765-4321.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !title.trim() || (acompanharWhats && !telefoneNormalizado)}
            >
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
