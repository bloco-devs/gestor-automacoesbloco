import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, Send, Sparkles, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useContextEngine } from "@/modules/context";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

type Msg = { role: "user" | "assistant"; content: string };

const HIDDEN_ROUTES = ["/auth", "/sso/callback", "/redefinir-senha", "/escolher-perfil", "/solicitar"];

function contextualPrompts(pathname: string): string[] {
  if (pathname.startsWith("/admin/demandas") || pathname.startsWith("/workspace")) {
    return ["Resumir a fila atual", "O que está bloqueado?", "Sugerir próximos passos"];
  }
  if (pathname.startsWith("/nova-solicitacao")) {
    return ["Como descrever bem minha demanda?", "Que informações são obrigatórias?"];
  }
  if (pathname.startsWith("/admin/analytics") || pathname.startsWith("/admin/saude")) {
    return ["Explicar estes gráficos", "Onde está o risco?"];
  }
  if (pathname.startsWith("/ecossistema") || pathname.startsWith("/diagrama")) {
    return ["Que sistemas mais integram?", "Quais integrações estão em risco?"];
  }
  return ["Como posso te ajudar aqui?", "Explique esta tela em uma frase"];
}

export function CopilotDock() {
  const enabled = useFeatureFlag("copilot-dock");
  const location = useLocation();
  const ctx = useContextEngine();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = useMemo(
    () => HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p)),
    [location.pathname],
  );

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, open, minimized]);

  if (!enabled || hidden) return null;

  const prompts = contextualPrompts(location.pathname);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    const nextMsgs: Msg[] = [...msgs, { role: "user", content: clean }];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    try {
      const snapshot = ctx?.getSnapshot?.();
      const contexto = snapshot
        ? `\n[contexto: rota=${location.pathname}; módulo=${snapshot.module ?? "—"}; papel=${snapshot.profile ?? "—"}]`
        : `\n[contexto: rota=${location.pathname}]`;
      const { data, error } = await supabase.functions.invoke("assistente-demanda", {
        body: {
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
          contexto,
        },
      });
      if (error) throw error;
      const reply = (data as { pergunta?: string; resposta?: string; content?: string })?.resposta
        ?? (data as { pergunta?: string })?.pergunta
        ?? (data as { content?: string })?.content
        ?? "Sem resposta.";
      setMsgs((m) => [...m, { role: "assistant", content: String(reply) }]);
    } catch (err) {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Não consegui responder agora. Tente novamente em instantes." },
      ]);
      // eslint-disable-next-line no-console
      console.warn("[copilot] falha:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg gap-2"
        aria-label="Abrir AI Copilot"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        Copilot
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-40 w-[min(380px,calc(100vw-2rem))] shadow-2xl border-border/60",
        minimized ? "h-auto" : "h-[min(560px,calc(100vh-6rem))]",
        "flex flex-col overflow-hidden",
      )}
      role="dialog"
      aria-label="AI Copilot"
    >
      <header className="flex items-center gap-2 border-b p-3 bg-muted/30">
        <Bot className="h-4 w-4 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-none">Copilot</div>
          <div className="text-[11px] text-muted-foreground truncate mt-0.5">{location.pathname}</div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setMinimized((m) => !m)}
          aria-label={minimized ? "Expandir" : "Minimizar"}>
          {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setOpen(false)} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </header>

      {!minimized && (
        <>
          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="p-3 space-y-3">
              {msgs.length === 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Assistente contextual. Sabe onde você está e o que está vendo.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {prompts.map((p) => (
                      <Badge
                        key={p}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent text-[11px] font-normal"
                        onClick={() => send(p)}
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  Pensando…
                </div>
              )}
            </div>
          </ScrollArea>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t p-2 flex items-end gap-2 bg-background"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Pergunte algo…"
              className="min-h-[36px] max-h-24 resize-none text-sm"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}

export default CopilotDock;
