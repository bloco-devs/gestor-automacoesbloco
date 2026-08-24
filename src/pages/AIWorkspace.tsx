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
        <div className="grid h-full min-h-0 w-full flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md lg:grid-cols-[1fr_320px]">
          {/* PAINEL PRINCIPAL DO CHAT */}
          <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
            <ConversationHeader
              onReset={handleReset}
              showReset={messages.length > 0}
              agenteNome="Blink"
              subtitulo="Assistente Virtual & Suporte Técnico"
            />

            <div className="flex h-full min-h-0 flex-1 flex-col p-3 overflow-hidden gap-3">
              <ChatContainer messages={messages} thinking={thinking || processing} />

              <KnowledgeSuggestions
                query={messages.filter((m) => m.role === "user").map((m) => m.content).join("\n")}
                origin="ai_workspace"
                enabled={!processing}
                onResolved={() => {
                  reset();
                  navigate("/portal");
                }}
              />

              {processing ? (
                <div
                  className="flex items-center justify-center gap-2.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-sm font-medium text-primary shadow-xs"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Estruturando solicitação e classificando prioridade com o Blink…
                </div>
              ) : (
                <ConversationInput
                  onSend={sendMessage}
                  disabled={thinking}
                  loading={thinking}
                  placeholder="Escreva sua resposta para o Blink…"
                  onAnexar={(arquivos) => void anexar(arquivos)}
                  anexos={anexos}
                  onRemoverAnexo={removerAnexo}
                  enviandoAnexo={anexandoArquivo}
                />
              )}

              <ConversationFooter turnsUsed={userTurns} maxTurns={maxUserTurns} phase={phase} />
            </div>
          </div>

          {/* PAINEL LATERAL DE CONTEXTO DO HELPDESK */}
          <aside className="hidden h-full flex-col border-l border-border/60 bg-muted/15 p-4 overflow-y-auto lg:flex gap-5 rolagem-discreta">
            <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Atendente Blink
                  </h3>
                  <p className="text-[11px] text-muted-foreground">IA Oficial Grupo Bloco</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O Blink entende sua necessidade, busca soluções na base de conhecimento e encaminha a demanda pronta para a equipe de desenvolvimento.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-emerald-500" /> Atendimento Garantido
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2.5">
                  <Clock className="size-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Triagem imediata:</strong> resposta instantânea em segundos.
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2.5">
                  <MessageSquare className="size-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Auditoria de chamados:</strong> histórico completo gravado.
                  </span>
                </li>
                <li className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/60 p-2.5">
                  <HelpCircle className="size-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground font-semibold">Resolução guiada:</strong> sugestão de artigos antes do envio.
                  </span>
                </li>
              </ul>
            </div>

            {user?.nome && (
              <div className="mt-auto rounded-xl border border-border/50 bg-card/80 p-3 text-xs text-muted-foreground">
                <span className="block font-medium text-foreground">Solicitante conectado:</span>
                <span className="truncate block font-semibold text-primary">{user.nome}</span>
              </div>
            )}
          </aside>
        </div>
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
