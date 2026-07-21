import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { Mic, MicOff, Paperclip, SendHorizontal, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAIWorkspace } from "@/hooks/useAIWorkspace";
import { ChatContainer } from "@/components/ai-workspace/ChatContainer";
import { ConversationInput } from "@/components/ai-workspace/ConversationInput";
import { ConversationFooter } from "@/components/ai-workspace/ConversationFooter";
import { PreviewPanel } from "@/components/ai-workspace/PreviewPanel";
import { KnowledgeSuggestions } from "@/modules/knowledge";

// Web Speech API — não é padrão em todos os navegadores, fallback silencioso.
type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
};
function getSpeech(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function Portal() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nome = (user?.nome ?? "").split(" ")[0];
  const started = phase !== "welcome";
  const showPreview = phase === "preview" || phase === "submitting";
  const processing = phase === "processing";

  useEffect(() => () => recognitionRef.current?.stop(), []);

  function handleSubmitDraft() {
    const t = draft.trim();
    if (!t) return;
    sendMessage(t);
    setDraft("");
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitDraft();
    }
  }

  function toggleMic() {
    const Ctor = getSpeech();
    if (!Ctor) {
      toast({
        title: "Reconhecimento de voz indisponível",
        description: "Seu navegador não suporta ditado. Tente pelo Chrome no computador.",
      });
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const txt = Array.from(e.results as unknown as ArrayLike<ArrayLike<{ transcript: string }>>)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (txt) setDraft((d) => (d ? `${d} ${txt}` : txt));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    // Reutilizaremos o mecanismo de anexos existente após a criação da solicitação.
    // Por ora, sinalizamos ao usuário que os arquivos precisam ser adicionados na tela da solicitação.
    toast({
      title: `${files.length} arquivo(s) selecionado(s)`,
      description: "Você poderá anexá-los na sua solicitação assim que ela for criada.",
    });
    e.target.value = "";
  }

  // ===== Etapa 1: tela inicial minimalista =====
  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6 sm:py-10">
        <header className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {nome ? `Olá, ${nome}!` : "Olá!"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Como podemos ajudar você hoje?
          </h1>
          <p className="text-sm text-muted-foreground">
            Conte com suas palavras. Nós cuidamos do resto.
          </p>
        </header>

        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder='Ex.: "Não consigo acessar o sistema."'
            rows={4}
            aria-label="Descreva seu problema ou sua necessidade"
            className="min-h-[110px] resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
            autoFocus
          />
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleMic}
                aria-pressed={listening}
                aria-label={listening ? "Parar gravação de voz" : "Falar"}
                className={listening ? "text-red-500" : ""}
              >
                {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                <span className="ml-1 hidden sm:inline">{listening ? "Ouvindo…" : "Falar"}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Anexar arquivos"
              >
                <Paperclip className="size-4" />
                <span className="ml-1 hidden sm:inline">Anexar</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFiles}
                aria-hidden
              />
            </div>
            <Button
              type="button"
              onClick={handleSubmitDraft}
              disabled={!draft.trim() || thinking}
              className="rounded-xl"
            >
              {thinking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Enviar <SendHorizontal className="ml-1 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <KnowledgeSuggestions
          query={draft}
          origin="portal"
          onResolved={() => {
            setDraft("");
            toast({
              title: "Perfeito!",
              description: "Sem necessidade de abrir solicitação. Estamos por aqui se precisar.",
            });
          }}
        />

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Quer ver suas solicitações?</span>
          <Link
            to="/minhas-solicitacoes"
            className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            Acompanhar <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  // ===== Etapa 2+: conversa / preview — reusa AI Workspace =====
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Estamos entendendo sua solicitação</h1>
        <p className="text-sm text-muted-foreground">
          Responda em poucas palavras. Você poderá revisar tudo antes de enviar.
        </p>
      </header>

      {!showPreview && (
        <>
          <ChatContainer messages={messages} thinking={thinking} />
          {processing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" /> Organizando sua solicitação…
            </div>
          )}
          <ConversationInput
            onSend={sendMessage}
            disabled={thinking || processing}
            loading={thinking}
            placeholder="Escreva sua resposta…"
          />
          <ConversationFooter turnsUsed={userTurns} maxTurns={maxUserTurns} phase={phase} />
        </>
      )}

      {showPreview && preview && (
        <PreviewPanel
          preview={preview}
          score={previewScore}
          setores={setoresDisponiveis}
          sistemas={sistemas}
          onChange={updatePreview}
          onConfirm={confirmSubmit}
          onCancel={reset}
          onBackToChat={goBackToChat}
          submitting={phase === "submitting"}
        />
      )}
    </div>
  );
}
