import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Clock, HelpCircle, Loader2, MessageSquare, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAIWorkspace } from "@/hooks/useAIWorkspace";
import { WelcomeSection } from "@/components/ai-workspace/WelcomeSection";
import { QuickActions, type QuickAction } from "@/components/ai-workspace/QuickActions";
import { ChatContainer } from "@/components/ai-workspace/ChatContainer";
import { ConversationInput } from "@/components/ai-workspace/ConversationInput";
import { ConversationHeader } from "@/components/ai-workspace/ConversationHeader";
import { ConversationFooter } from "@/components/ai-workspace/ConversationFooter";
import { PreviewDaDemanda } from "@/modules/helpdesk";
import { ConfirmDialog } from "@/components/ai-workspace/ConfirmDialog";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import { HelpdeskChatLayout } from "@/components/ai-workspace/HelpdeskChatLayout";

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
    demandaDoPreview,
    sistemaDoPreview,
    anexos,
    anexandoArquivo,
    anexar,
    removerAnexo,
    sendMessage,
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
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] w-full max-w-6xl flex-col gap-3 p-2 sm:p-4">
      <div className="flex items-center justify-between shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar à Central
        </Button>

        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
          Central de Atendimento & Helpdesk
        </span>
      </div>

      {phase === "welcome" && (
        <div className="mx-auto max-w-3xl space-y-6 py-4 w-full">
          <WelcomeSection nome={user?.nome ?? ""} />
          <QuickActions onPick={handleQuickAction} disabled={thinking} />
          <div className="pt-2">
            <ConversationInput
              onSend={sendMessage}
              disabled={thinking}
              loading={thinking}
              placeholder="Descreva sua dúvida, problema ou solicitação de automação aqui…"
              onAnexar={(arquivos) => void anexar(arquivos)}
              anexos={anexos}
              onRemoverAnexo={removerAnexo}
              enviandoAnexo={anexandoArquivo}
            />
            <ConversationFooter turnsUsed={0} maxTurns={maxUserTurns} phase={phase} />
          </div>
        </div>
      )}

      {showChat && !showPreview && (
        <HelpdeskChatLayout
          user={user}
          messages={messages}
          thinking={thinking}
          processing={processing}
          sendMessage={sendMessage}
          onReset={handleReset}
          onBack={() => navigate(-1)}
          anexos={anexos}
          anexar={(arquivos) => void anexar(arquivos)}
          removerAnexo={removerAnexo}
          anexandoArquivo={anexandoArquivo}
          userTurns={userTurns}
          maxUserTurns={maxUserTurns}
          phase={phase}
        >
          <KnowledgeSuggestions
            query={messages.filter((m) => m.role === "user").map((m) => m.content).join("\n")}
            origin="ai_workspace"
            enabled={!processing}
            onResolved={() => {
              reset();
              navigate("/portal");
            }}
          />
        </HelpdeskChatLayout>
      )}

      {showPreview && demandaDoPreview && (
        <div className="mx-auto max-w-3xl w-full">
          <PreviewDaDemanda
            nova={demandaDoPreview}
            sistemaNome={sistemaDoPreview}
            anexos={anexos}
            onConfirmar={confirmSubmit}
            onVoltarParaConversa={goBackToChat}
            enviando={phase === "submitting"}
          />
        </div>
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
