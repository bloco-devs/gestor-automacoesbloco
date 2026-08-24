import { useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  HelpCircle,
  Loader2,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/blink/Blink";
import { ChatContainer } from "./ChatContainer";
import { ConversationInput } from "./ConversationInput";
import { ConversationFooter } from "./ConversationFooter";
import type { AnexoDeRascunho } from "@/modules/demand-access";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface HelpdeskChatLayoutProps {
  user: { nome?: string | null; email?: string | null; avatarUrl?: string | null } | null;
  messages: ChatMsg[];
  thinking: boolean;
  processing: boolean;
  sendMessage: (text: string) => void;
  onReset: () => void;
  onBack?: () => void;
  anexos?: AnexoDeRascunho[];
  anexar?: (files: File[]) => void;
  removerAnexo?: (id: string) => void;
  anexandoArquivo?: boolean;
  userTurns: number;
  maxUserTurns: number;
  phase: string;
  queryForKnowledge?: string;
  children?: React.ReactNode;
}

// Conversas simuladas de histórico no estilo Chat2Desk / Paldesk
const RECENT_CHATS = [
  {
    id: "live-blink",
    title: "Blink (Atendente Virtual)",
    subtitle: "Atendimento inteligente ativo",
    time: "Agora",
    active: true,
    badge: "IA Online",
    badgeTone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    isIa: true,
  },
  {
    id: "chat-rh",
    title: "Suporte RH & Benefícios",
    subtitle: "Chamado RH-2608-0012 concluído",
    time: "Ontem",
    active: false,
    badge: "RH",
    badgeTone: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    isIa: false,
  },
  {
    id: "chat-ti",
    title: "Infraestrutura & Acessos",
    subtitle: "Ticket IN-2608-0004 atendido",
    time: "22 ago",
    active: false,
    badge: "TI",
    badgeTone: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    isIa: false,
  },
];

export function HelpdeskChatLayout({
  user,
  messages,
  thinking,
  processing,
  sendMessage,
  onReset,
  onBack,
  anexos = [],
  anexar,
  removerAnexo,
  anexandoArquivo = false,
  userTurns,
  maxUserTurns,
  phase,
  children,
}: HelpdeskChatLayoutProps) {
  const [selectedChatId, setSelectedChatId] = useState("live-blink");
  const [filtroConversa, setFiltroConversa] = useState("");

  const nomeSolicitante = user?.nome || "Solicitante";
  const emailSolicitante = user?.email || "solicitante@grupobloco.com.br";

  const conversasFiltradas = RECENT_CHATS.filter(
    (c) =>
      c.title.toLowerCase().includes(filtroConversa.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(filtroConversa.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-4.5rem)] w-full max-w-[1400px] mx-auto flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl">
      {/* ─── BARRA SUPERIOR DE NAVEGAÇÃO HELPDESK (Estilo Paldesk / Chat2Desk Header) ─── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card px-4 text-foreground">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Bot className="size-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">
                Central de Chat & Helpdesk
              </h1>
              <p className="text-[11px] text-muted-foreground">
                Grupo Bloco · Atendimento Solicitantes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs gap-1.5 py-1 px-2.5">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            Blink IA Operacional
          </Badge>
        </div>
      </header>

      {/* ─── CORPO PRINCIPAL EM 3 COLUNAS (Estilo Chat2Desk / Paldesk) ─── */}
      <div className="grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr_300px]">
        {/* ─── COLUNA 1: LISTA DE CONVERSAS / CHATS (Esquerda) ─── */}
        <aside className="hidden flex-col border-r border-border/70 bg-muted/20 lg:flex overflow-hidden">
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Conversas (3)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-7 text-[11px] font-semibold text-primary hover:bg-primary/10 px-2"
              >
                + Nova
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtroConversa}
                onChange={(e) => setFiltroConversa(e.target.value)}
                placeholder="Buscar conversa…"
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 rolagem-discreta">
            {conversasFiltradas.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => setSelectedChatId(chat.id)}
                className={cn(
                  "w-full text-left rounded-xl p-3 transition-all duration-200 border flex flex-col gap-1.5",
                  chat.id === selectedChatId
                    ? "bg-card border-primary/40 shadow-xs ring-1 ring-primary/20"
                    : "bg-transparent border-transparent hover:bg-card/60 hover:border-border/60",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="size-7 shrink-0 border border-border">
                      {chat.isIa ? (
                        <div className="flex size-full items-center justify-center bg-emerald-500/10">
                          <Blink className="size-full" animado />
                        </div>
                      ) : (
                        <AvatarFallback className="text-[10px] bg-muted">
                          {chat.title.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="truncate text-xs font-bold text-foreground">
                      {chat.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {chat.time}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground truncate leading-tight">
                  {chat.subtitle}
                </p>

                <div className="flex items-center justify-between pt-0.5">
                  <Badge
                    variant="outline"
                    className={cn("text-[9px] py-0 px-1.5 font-semibold", chat.badgeTone)}
                  >
                    {chat.badge}
                  </Badge>
                  {chat.id === selectedChatId && (
                    <span className="size-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ─── COLUNA 2: ÁREA CENTRAL DE CHAT (Header, Mensagens e Input) ─── */}
        <main className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
          {/* Header da Conversa Ativa */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-card px-4 py-2 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="size-9 border border-border/80 shadow-xs">
                  <div className="flex size-full items-center justify-center bg-emerald-500/10">
                    <Blink className="size-full" animado />
                  </div>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground leading-none">
                    Blink (Atendente de Automação)
                  </h2>
                  <Sparkles className="size-3.5 text-emerald-500" />
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Online · Atendimento Ativo 24/7
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-8 gap-1.5 text-xs font-semibold border-border/80"
            >
              <RotateCcw className="size-3.5 text-primary" /> Nova conversa
            </Button>
          </div>

          {/* Área de Mensagens com Rolagem Automática */}
          <div className="flex h-full min-h-0 flex-1 flex-col p-3 overflow-hidden gap-3 bg-slate-50/50 dark:bg-slate-950/20">
            <ChatContainer messages={messages} thinking={thinking || processing} />

            {children}

            {processing ? (
              <div
                className="flex items-center justify-center gap-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3.5 text-xs font-semibold text-primary shadow-xs"
                role="status"
                aria-live="polite"
              >
                <Loader2 className="size-4 animate-spin text-primary" />
                Estruturando sua solicitação com inteligência artificial…
              </div>
            ) : (
              <ConversationInput
                onSend={sendMessage}
                disabled={thinking}
                loading={thinking}
                placeholder="Digite sua mensagem para o Blink ou anexe um arquivo…"
                onAnexar={anexar}
                anexos={anexos}
                onRemoverAnexo={removerAnexo}
                enviandoAnexo={anexandoArquivo}
              />
            )}

            <ConversationFooter turnsUsed={userTurns} maxTurns={maxUserTurns} phase={phase} />
          </div>
        </main>

        {/* ─── COLUNA 3: PAINEL LATERAL DE DETALHES / TICKET (Direita - Estilo Paldesk) ─── */}
        <aside className="hidden h-full flex-col border-l border-border/70 bg-muted/15 p-4 overflow-y-auto lg:flex gap-5 rolagem-discreta">
          {/* Ficha do Solicitante */}
          <div className="rounded-xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border border-border shadow-xs">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={nomeSolicitante} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {nomeSolicitante.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-bold text-foreground truncate">
                  {nomeSolicitante}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {emailSolicitante}
                </p>
              </div>
            </div>
            <div className="pt-1 flex items-center justify-between text-[11px] border-t border-border/50 text-muted-foreground">
              <span>Status da conta:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ativo</span>
            </div>
          </div>

          {/* Ficha da Solicitação Atual */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-primary" /> Informações do Atendimento
            </h4>

            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Canal de Entrada</span>
                <p className="font-semibold text-foreground">Chat Web / Portal Bloco</p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Atendente Designado</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Bot className="size-3.5" /> Blink (IA Oficial)
                </p>
              </div>

              <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">SLA Resposta</span>
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-amber-500" /> Instantânea (&lt; 5s)
                </p>
              </div>
            </div>
          </div>

          {/* Informações Úteis */}
          <div className="mt-auto rounded-xl border border-border/60 bg-primary/5 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <ShieldCheck className="size-4" /> Suporte Grupo Bloco
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sua conversa gera um registro auditável. Após o envio, você pode acompanhar o status na aba Minhas Demandas.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
