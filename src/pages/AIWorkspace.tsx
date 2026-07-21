import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAIWorkspace } from "@/hooks/useAIWorkspace";
import { WelcomeSection } from "@/components/ai-workspace/WelcomeSection";
import { QuickActions, type QuickAction } from "@/components/ai-workspace/QuickActions";
import { ChatContainer } from "@/components/ai-workspace/ChatContainer";
import { ConversationInput } from "@/components/ai-workspace/ConversationInput";
import { ConversationHeader } from "@/components/ai-workspace/ConversationHeader";
import { ConversationFooter } from "@/components/ai-workspace/ConversationFooter";
import { PreviewPanel } from "@/components/ai-workspace/PreviewPanel";
import { ConfirmDialog } from "@/components/ai-workspace/ConfirmDialog";
import { Loader2 } from "lucide-react";

export default function AIWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
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

  const showChat = phase !== "welcome";
  const showPreview = phase === "preview" || phase === "submitting";
  const processing = phase === "processing";

  function handleQuickAction(a: QuickAction) {
    sendMessage(a.prompt);
  }

  function handleReset() {
    if (messages.length === 0 && !preview) {
      reset();
    } else {
      setConfirmReset(true);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
        >
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      </div>

      {phase === "welcome" && (
        <div className="space-y-5">
          <WelcomeSection nome={user?.nome ?? ""} />
          <QuickActions onPick={handleQuickAction} disabled={thinking} />
          <div className="pt-2">
            <ConversationInput
              onSend={sendMessage}
              disabled={thinking}
              loading={thinking}
              placeholder="Ou simplesmente escreva sua demanda aqui…"
            />
            <ConversationFooter turnsUsed={0} maxTurns={maxUserTurns} phase={phase} />
          </div>
        </div>
      )}

      {showChat && !showPreview && (
        <div className="space-y-3">
          <ConversationHeader onReset={handleReset} showReset={messages.length > 0} />
          <ChatContainer messages={messages} thinking={thinking || processing} />
          {processing ? (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-4 animate-spin" />
              Estruturando sua solicitação com base na conversa…
            </div>
          ) : (
            <ConversationInput
              onSend={sendMessage}
              disabled={thinking}
              loading={thinking}
              placeholder="Continue a conversa…"
            />
          )}
          <ConversationFooter turnsUsed={userTurns} maxTurns={maxUserTurns} phase={phase} />
        </div>
      )}

      {showPreview && preview && (
        <PreviewPanel
          preview={preview}
          score={previewScore}
          setores={setoresDisponiveis}
          sistemas={sistemas}
          onChange={updatePreview}
          onConfirm={confirmSubmit}
          onCancel={handleReset}
          onBackToChat={goBackToChat}
          submitting={phase === "submitting"}
        />
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        onConfirm={() => {
          setConfirmReset(false);
          reset();
        }}
      />
    </div>
  );
}
