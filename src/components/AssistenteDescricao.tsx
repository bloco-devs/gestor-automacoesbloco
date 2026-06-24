import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DataSourceBadge } from "@/components/DataSourceBadge";

type ChatMessage = { role: "user" | "assistant"; content: string };

interface Props {
  onAccept: (descricao: string) => void;
}

const INITIAL_QUESTION =
  "Em poucas palavras, qual atividade ou processo você gostaria de melhorar/automatizar?";

export function AssistenteDescricao({ onAccept }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_QUESTION },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"chatting" | "preview">("chatting");
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function reset() {
    setMessages([{ role: "assistant", content: INITIAL_QUESTION }]);
    setInput("");
    setPhase("chatting");
    setDraft("");
    setDone(false);
  }

  async function sendAnswer() {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistente-demanda", {
        body: { action: "next_question", messages: next },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data.done) {
        setDone(true);
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Ótimo! Tenho informações suficientes. Clique em \"Gerar descrição\" abaixo.",
          },
        ]);
      } else if (data.question) {
        setMessages((m) => [...m, { role: "assistant", content: data.question }]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao consultar IA";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("assistente-demanda", {
        body: { action: "generate_description", messages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data.description ?? "");
      setPhase("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao gerar descrição";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function accept() {
    onAccept(draft);
    setOpen(false);
    setTimeout(reset, 200);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setTimeout(reset, 200);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="size-4" />
          Descrever com ajuda da IA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assistente de solicitação</DialogTitle>
          <DialogDescription>
            Responda algumas perguntas e a IA vai montar a descrição para você.
          </DialogDescription>
        </DialogHeader>

        {phase === "chatting" ? (
          <>
            <div
              ref={scrollRef}
              className="max-h-[360px] min-h-[240px] space-y-3 overflow-y-auto rounded-md border bg-muted/30 p-3"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> pensando…
                </div>
              )}
            </div>

            {!done ? (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendAnswer();
                    }
                  }}
                  placeholder="Digite sua resposta…"
                  disabled={loading}
                />
                <Button type="button" onClick={sendAnswer} disabled={loading || !input.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" onClick={generate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Gerar descrição
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Descrição gerada</span>
              <DataSourceBadge source="IA" />
            </div>
            <Textarea
              rows={8}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={reset} disabled={loading}>
                Refazer
              </Button>
              <Button type="button" onClick={accept} disabled={loading || !draft.trim()}>
                Usar esta descrição
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
