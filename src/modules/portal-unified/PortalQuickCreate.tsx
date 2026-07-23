import { useRef, useState, type KeyboardEvent } from "react";
import { Loader2, SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAIWorkspace } from "@/hooks/useAIWorkspace";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import { DuplicatePreventionPanel } from "@/components/portal/DuplicatePreventionPanel";
import { ChatContainer } from "@/components/ai-workspace/ChatContainer";
import { ConversationInput } from "@/components/ai-workspace/ConversationInput";
import { ConversationFooter } from "@/components/ai-workspace/ConversationFooter";
import { PreviewPanel } from "@/components/ai-workspace/PreviewPanel";
import { ThinkingSteps } from "@/components/portal/ThinkingSteps";
import { RichConfirmation } from "@/components/portal/RichConfirmation";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

/**
 * PortalQuickCreate — Campo unificado de nova demanda.
 * Reutiliza integralmente o AI Workspace existente.
 * Nenhuma IA/edge nova; nenhum backend novo.
 */
export function PortalQuickCreate() {
  const {
    phase,
    messages,
    thinking,
    userTurns,
    maxUserTurns,
    preview,
    previewScore,
    setoresDisponiveis,
    sistemas,
    sendMessage,
    updatePreview,
    confirmSubmit,
    reset,
    goBackToChat,
  } = useAIWorkspace();
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const started = phase !== "welcome";
  const showPreview = phase === "preview" || phase === "submitting";
  const submitting = phase === "submitting";
  const processing = phase === "processing";

  function submit() {
    const t = draft.trim();
    if (!t) return;
    sendMessage(t);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  if (started) {
    return (
      <section className="flex flex-col gap-6">
        {!showPreview && (
          <>
            <ChatContainer messages={messages} thinking={thinking} />
            {processing && <ThinkingSteps />}
            <ConversationInput
              onSend={sendMessage}
              disabled={thinking || processing}
              loading={thinking}
              placeholder="Escreva sua resposta…"
            />
            <ConversationFooter turnsUsed={userTurns} maxTurns={maxUserTurns} phase={phase} />
          </>
        )}
        {showPreview && preview && !submitting && (
          <PreviewPanel
            preview={preview}
            score={previewScore}
            setores={setoresDisponiveis}
            sistemas={sistemas}
            onChange={updatePreview}
            onConfirm={confirmSubmit}
            onCancel={reset}
            onBackToChat={goBackToChat}
            submitting={false}
          />
        )}
        {submitting && preview && (
          <RichConfirmation
            preview={preview}
            score={previewScore}
            onTrack={() => navigate("/portal/demandas")}
          />
        )}
      </section>
    );
  }

  return (
    <section aria-label="Descreva sua necessidade" className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-elev-1 transition focus-within:ring-2 focus-within:ring-ring/40">
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Descreva sua necessidade…"
          rows={4}
          aria-label="Descreva sua necessidade"
          className="min-h-[120px] resize-none border-0 bg-transparent px-2 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
          autoFocus
        />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            <Sparkles className="mr-1 inline size-3" /> A IA sugere soluções enquanto você digita.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={submit}
            disabled={!draft.trim() || thinking}
            className="rounded-xl px-5"
          >
            {thinking ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Nova Demanda <SendHorizontal className="ml-1.5 size-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      <DuplicatePreventionPanel query={draft} />

      <KnowledgeSuggestions
        query={draft}
        origin="portal"
        onResolved={() => {
          setDraft("");
          toast({
            title: "Resolvido pela Base de Conhecimento",
            description: "Sem necessidade de abrir demanda. Estamos por aqui se precisar.",
          });
        }}
      />
    </section>
  );
}
