import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Mic,
  MicOff,
  Paperclip,
  SendHorizontal,
  Loader2,
  ArrowRight,
  Search,
  BookOpen,
  Sparkles,
  Play,
  MessageSquare,
  UploadCloud,
  KeyRound,
  Users,
  DollarSign,
  MonitorSmartphone,
  Bot,
  Building2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { STATUS_COLUMNS, type Demand, type DemandStatus } from "@/modules/demands/types";
import { supabase } from "@/integrations/supabase/client";
import { ThinkingSteps } from "@/components/portal/ThinkingSteps";
import { RichConfirmation } from "@/components/portal/RichConfirmation";
import { UniversalSearch } from "@/components/portal/UniversalSearch";
import { useFavoriteDemands } from "@/components/portal/useFavoriteDemands";
import { useNavigate } from "react-router-dom";

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

// ---- Exemplos estilo ChatGPT ---------------------------------------------
const EXAMPLES = [
  "Não consigo acessar o sistema RH",
  "Preciso de um relatório financeiro",
  "Quero automatizar um processo",
  "Meu computador não liga",
];

// ---- Categorias humanizadas para a Central --------------------------------
const CATEGORIAS = [
  { label: "Acessos", icon: KeyRound, tone: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
  { label: "Portal RH", icon: Users, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
  { label: "Financeiro", icon: DollarSign, tone: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
  { label: "TI", icon: MonitorSmartphone, tone: "text-violet-600 dark:text-violet-400 bg-violet-500/10" },
  { label: "Automação", icon: Bot, tone: "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10" },
  { label: "Administrativo", icon: Building2, tone: "text-slate-600 dark:text-slate-300 bg-slate-500/10" },
];

// ---- Status "amigável" para o histórico -----------------------------------
function statusVibe(status: DemandStatus): { label: string; dot: string; done: boolean } {
  if (status === "concluido") return { label: "Concluído", dot: "bg-emerald-500", done: true };
  if (status === "backlog") return { label: "Recebida", dot: "bg-slate-400", done: false };
  return { label: "Em andamento", dot: "bg-amber-500", done: false };
}

function humanTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "há poucos minutos";
  if (h < 24) return `há ${h} hora${h > 1 ? "s" : ""}`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

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
    .limit(8);
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
  const [dragOver, setDragOver] = useState(false);
  const [attached, setAttached] = useState<string[]>([]);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saudacao = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);
  const nome = (user?.nome ?? "").split(" ")[0];
  const started = phase !== "welcome";
  const showPreview = phase === "preview" || phase === "submitting";
  const submitting = phase === "submitting";
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
    return demands.filter((d) => d.created_by === user.id).slice(0, 3);
  }, [demands, user?.id]);

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
    setAttached([]);
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitDraft();
    }
  }

  function pickExample(text: string) {
    setDraft(text);
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

  function addFiles(files: File[]) {
    if (!files.length) return;
    setAttached((prev) => [...prev, ...files.map((f) => f.name)].slice(0, 8));
    toast({
      title: `${files.length} arquivo(s) prontos`,
      description: "Serão anexados assim que a solicitação for criada.",
    });
  }

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
    e.target.value = "";
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    addFiles(files);
  }

  // ===== Etapa 2+: conversa / preview =====================================
  if (started) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {!submitting && (
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Estamos entendendo sua solicitação
            </h1>
            <p className="text-sm text-muted-foreground">
              Responda com suas próprias palavras. Você poderá revisar tudo antes de enviar.
            </p>
          </header>
        )}

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

        {/* 7 · Pós envio — Confirmação Rica */}
        {submitting && preview && (
          <RichConfirmation
            preview={preview}
            score={previewScore}
            onTrack={() => navigate("/minhas-solicitacoes")}
          />
        )}
      </div>
    );
  }

  // ===== Home do Portal (v3) ==============================================
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-16 px-4 py-10 sm:py-20">
      {/* 1 · Hero */}
      <header className="space-y-3 text-center">
        <p className="text-base font-medium text-muted-foreground">
          {saudacao}
          {nome ? `, ${nome}` : ""}.
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Como posso ajudar você hoje?
        </h1>
      </header>

      {/* 2 · Grande caixa de conversa (drag & drop) */}
      <section aria-label="Descreva o que aconteceu" className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-3xl border bg-card p-4 shadow-elev-1 transition focus-within:shadow-elev-2 focus-within:ring-2 focus-within:ring-ring/40 ${
            dragOver ? "border-primary/60 ring-2 ring-primary/30" : "border-border"
          }`}
        >
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Descreva o que aconteceu…"
            rows={5}
            aria-label="Descreva o que aconteceu"
            className="min-h-[160px] resize-none border-0 bg-transparent px-3 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            autoFocus
          />

          {attached.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 px-1">
              {attached.map((n) => (
                <Badge key={n} variant="secondary" className="max-w-[16rem] truncate">
                  <Paperclip className="mr-1 size-3" /> {n}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
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

        {/* 5 · Área de upload sugerida */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <UploadCloud className="size-5" />
          <span>
            Arraste imagens, PDF, prints ou vídeos aqui — ou{" "}
            <span className="font-medium text-foreground underline underline-offset-4">
              clique para escolher
            </span>
          </span>
        </button>

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

        {/* Exemplos */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Exemplos
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => pickExample(ex)}
                className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · Continue de onde parou */}
      <section aria-labelledby="continue" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="continue" className="text-lg font-semibold tracking-tight">
            Continue de onde parou
          </h2>
          {myRequests.length > 0 && (
            <Link
              to="/minhas-solicitacoes"
              className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
            >
              Ver todas <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {loadingDemands ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : myRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageSquare className="size-5" />
            </div>
            <p className="mt-3 text-sm font-medium">
              Você ainda não possui solicitações.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando precisar de ajuda, basta conversar comigo. 😊
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {myRequests.map((d) => {
              const vibe = statusVibe(d.status);
              const isDone = vibe.done;
              const statusLabel =
                STATUS_COLUMNS.find((s) => s.id === d.status)?.label ?? d.status;
              return (
                <li key={d.id}>
                  <Link
                    to="/minhas-solicitacoes"
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-elev-1"
                  >
                    <span
                      aria-hidden
                      className={`inline-block size-2.5 shrink-0 rounded-full ${vibe.dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {vibe.label}
                        </span>
                        <span className="text-xs text-muted-foreground/60">·</span>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium">
                        {d.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Atualizado {humanTime(d.updated_at ?? d.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1"
                      tabIndex={-1}
                    >
                      {isDone ? (
                        <>
                          Ver conversa <ArrowRight className="size-3.5" />
                        </>
                      ) : (
                        <>
                          <Play className="size-3.5" /> Continuar
                        </>
                      )}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 8 · Central de soluções (Notion-like) */}
      <section aria-labelledby="kb" className="space-y-5">
        <div className="flex items-center justify-between">
          <h2
            id="kb"
            className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <BookOpen className="size-4" /> Pesquisar ajuda
          </h2>
          <Link
            to="/portal/central"
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Explorar tudo <ArrowRight className="size-3.5" />
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

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categorias
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CATEGORIAS.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setKbQuery(c.label)}
                  className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elev-1"
                >
                  <span
                    aria-hidden
                    className={`flex size-9 items-center justify-center rounded-xl ${c.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loadingArticles ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            Nenhum artigo por aqui ainda. Assim que houver, aparecerá neste espaço. ✨
          </div>
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
                  className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elev-2"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="size-3.5" /> Artigo recomendado
                  </div>
                  <p className="line-clamp-2 text-base font-semibold leading-tight group-hover:underline">
                    {a.titulo}
                  </p>
                  {a.resumo && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.resumo}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Leitura: 2 minutos</span>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Resolver agora <ArrowRight className="size-3.5" />
                    </span>
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
