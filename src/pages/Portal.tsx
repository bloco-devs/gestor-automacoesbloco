import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Paperclip,
  SendHorizontal,
  Loader2,
  ArrowRight,
  Bug,
  Lightbulb,
  HelpCircle,
  Cog,
  Search,
  BookOpen,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAIWorkspace } from "@/hooks/useAIWorkspace";
import { ChatContainer } from "@/components/ai-workspace/ChatContainer";
import { ConversationInput } from "@/components/ai-workspace/ConversationInput";
import { ConversationFooter } from "@/components/ai-workspace/ConversationFooter";
import { PreviewPanel } from "@/components/ai-workspace/PreviewPanel";
import { KnowledgeSuggestions } from "@/modules/knowledge";
import { useDemands } from "@/modules/demands/hooks";
import { STATUS_COLUMNS, type Demand } from "@/modules/demands/types";
import { supabase } from "@/integrations/supabase/client";

// ---- Web Speech API (fallback silencioso) ---------------------------------
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

// ---- Ações rápidas (linguagem 100% leiga) ---------------------------------
const QUICK_PICKS = [
  {
    id: "problema",
    icon: Bug,
    title: "Reportar um problema",
    hint: "Algo parou de funcionar",
    prompt: "Quero relatar um problema: ",
    tone: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  {
    id: "melhoria",
    icon: Lightbulb,
    title: "Sugerir uma melhoria",
    hint: "Uma ideia para melhorar o dia a dia",
    prompt: "Tenho uma sugestão de melhoria: ",
    tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    id: "duvida",
    icon: HelpCircle,
    title: "Tirar uma dúvida",
    hint: "Preciso de uma orientação",
    prompt: "Tenho uma dúvida sobre: ",
    tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    id: "automacao",
    icon: Cog,
    title: "Pedir uma automação",
    hint: "Automatizar um processo repetitivo",
    prompt: "Preciso automatizar o seguinte processo: ",
    tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
] as const;

// ---- Base de conhecimento (leve, no rodapé) -------------------------------
interface QuickArticle {
  id: string;
  titulo: string;
  resumo: string | null;
  categoria: string | null;
  url_externa: string | null;
}

async function fetchQuickArticles(): Promise<QuickArticle[]> {
  const { data, error } = await supabase
    .from("knowledge_articles")
    .select("id, titulo, resumo, categoria, url_externa, updated_at")
    .eq("status", "publicado")
    .order("updated_at", { ascending: false })
    .limit(6);
  if (error) return [];
  return (data ?? []) as QuickArticle[];
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
  const [kbQuery, setKbQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const nome = (user?.nome ?? "").split(" ")[0];
  const started = phase !== "welcome";
  const showPreview = phase === "preview" || phase === "submitting";
  const processing = phase === "processing";

  useEffect(() => () => recognitionRef.current?.stop(), []);
  useEffect(() => {
    if (!started) textareaRef.current?.focus();
  }, [started]);

  const { data: demands = [], isLoading: loadingDemands } = useDemands();
  const { data: articles = [], isLoading: loadingArticles } = useQuery({
    queryKey: ["portal-quick-articles"],
    queryFn: fetchQuickArticles,
    staleTime: 5 * 60 * 1000,
  });

  const myRequests = useMemo<Demand[]>(() => {
    if (!user?.id) return [];
    return demands.filter((d) => d.created_by === user.id).slice(0, 5);
  }, [demands, user?.id]);

  const categorias = useMemo(() => {
    const set = new Set<string>();
    for (const a of articles) if (a.categoria) set.add(a.categoria);
    return Array.from(set).slice(0, 6);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = kbQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.titulo.toLowerCase().includes(q) ||
        (a.resumo ?? "").toLowerCase().includes(q) ||
        (a.categoria ?? "").toLowerCase().includes(q),
    );
  }, [articles, kbQuery]);

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

  function pickQuick(prompt: string) {
    setDraft((d) => (d ? d : prompt));
    setTimeout(() => textareaRef.current?.focus(), 0);
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
    toast({
      title: `${files.length} arquivo(s) selecionado(s)`,
      description: "Você poderá anexá-los na sua solicitação assim que ela for criada.",
    });
    e.target.value = "";
  }

  // ===== Etapa 2+: conversa / preview — reusa AI Workspace ================
  if (started) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Estamos entendendo sua solicitação
          </h1>
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

  // ===== Home do Portal (v2) ==============================================
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-4 py-10 sm:py-16">
      {/* 1 · Boas-vindas */}
      <header className="space-y-3 text-center">
        <p className="text-base font-medium text-muted-foreground">
          {nome ? `Olá, ${nome} 👋` : "Olá 👋"}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Como podemos ajudar você hoje?
        </h1>
        <p className="text-base text-muted-foreground">
          Conte com suas palavras. Nós cuidamos do resto.
        </p>
      </header>

      {/* 2 · Grande caixa de conversa */}
      <section aria-label="Descreva o que aconteceu" className="space-y-3">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-elev-1 transition focus-within:shadow-elev-2 focus-within:ring-2 focus-within:ring-ring/40">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Descreva o que aconteceu…"
            rows={4}
            aria-label="Descreva o que aconteceu"
            className="min-h-[130px] resize-none border-0 bg-transparent px-3 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            autoFocus
          />
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
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
                <span className="ml-1 hidden sm:inline">
                  {listening ? "Ouvindo…" : "Falar"}
                </span>
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
              size="lg"
              onClick={handleSubmitDraft}
              disabled={!draft.trim() || thinking}
              className="rounded-xl px-5"
            >
              {thinking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Enviar <SendHorizontal className="ml-1.5 size-4" />
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
              description:
                "Sem necessidade de abrir solicitação. Estamos por aqui se precisar.",
            });
          }}
        />
      </section>

      {/* 3 · Sugestões rápidas */}
      <section aria-labelledby="quick-picks" className="space-y-4">
        <h2
          id="quick-picks"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Sugestões
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_PICKS.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => pickQuick(q.prompt)}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elev-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  aria-hidden
                  className={`flex size-11 items-center justify-center rounded-xl ${q.tone}`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold leading-tight">
                    {q.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{q.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 · Minhas últimas solicitações */}
      <section aria-labelledby="my-requests" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="my-requests"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2"
          >
            <Clock className="size-3.5" /> Minhas últimas solicitações
          </h2>
          <Link
            to="/minhas-solicitacoes"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver todas <ArrowRight className="size-3" />
          </Link>
        </div>

        {loadingDemands ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : myRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            Você ainda não tem solicitações. Comece descrevendo o que precisa lá em cima. ✨
          </div>
        ) : (
          <ul className="space-y-2">
            {myRequests.map((d) => {
              const status = STATUS_COLUMNS.find((s) => s.id === d.status);
              return (
                <li key={d.id}>
                  <Link
                    to="/minhas-solicitacoes"
                    className="block rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-elev-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {status?.label ?? d.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(d.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 5 · Central de Soluções (rodapé, leve) */}
      <section aria-labelledby="kb" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="kb"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-2"
          >
            <BookOpen className="size-3.5" /> Central de soluções
          </h2>
          <Link
            to="/portal/central"
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Explorar tudo <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/40">
          <Search className="ml-2 size-4 text-muted-foreground" />
          <Input
            value={kbQuery}
            onChange={(e) => setKbQuery(e.target.value)}
            placeholder="Pesquisar artigos, guias e respostas…"
            aria-label="Pesquisar na base de conhecimento"
            className="border-0 shadow-none focus-visible:ring-0"
          />
        </div>

        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setKbQuery(c)}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loadingArticles ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            Nenhum artigo por aqui ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredArticles.slice(0, 6).map((a) => {
              const href = a.url_externa ? a.url_externa : `/ajuda?artigo=${a.id}`;
              const external = !!a.url_externa;
              return (
                <a
                  key={a.id}
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-elev-1"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                      <Sparkles className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium leading-tight group-hover:underline">
                        {a.titulo}
                      </p>
                      {a.resumo && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {a.resumo}
                        </p>
                      )}
                      {a.categoria && (
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {a.categoria}
                        </Badge>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
