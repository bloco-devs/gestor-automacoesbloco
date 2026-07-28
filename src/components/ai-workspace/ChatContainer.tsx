import { memo, useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConversationMessage } from "./ConversationMessage";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyConversation } from "./EmptyConversation";
import { useVozDoBlink } from "@/hooks/useVozDoBlink";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  messages: ChatMsg[];
  thinking: boolean;
}

export const ChatContainer = memo(function ChatContainer({ messages, thinking }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const voz = useVozDoBlink();
  const ultimaFalada = useRef<string | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  /**
   * O ÁUDIO ACOMPANHA O TEXTO, NÃO O SUBSTITUI
   *
   * A resposta escrita aparece na hora; a voz entra quando o áudio fica
   * pronto, um instante depois. Segurar o texto até a voz chegar seria
   * trocar uma informação imediata por uma espera — e quem está com um
   * problema quer ler a resposta, não aguardar a locução.
   *
   * `ultimaFalada` evita repetir a mesma frase quando o componente
   * renderiza de novo por qualquer outro motivo. Ouvir duas vezes a mesma
   * pergunta faz a pessoa achar que ela não foi respondida.
   */
  useEffect(() => {
    const ultima = messages[messages.length - 1];
    if (!ultima || ultima.role !== "assistant") return;
    if (ultimaFalada.current === ultima.content) return;
    ultimaFalada.current = ultima.content;
    void voz.falar(ultima.content);
  }, [messages, voz]);

  return (
    <div className="space-y-2">
      {voz.disponivel && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={voz.alternar}
            aria-pressed={voz.ligada}
            title={voz.ligada ? "Desligar a voz do Blink" : "Ouvir as respostas do Blink"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              voz.ligada
                ? "text-foreground hover:bg-muted/60"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {voz.ligada ? (
              <Volume2 className={cn("size-3.5", voz.falando && "animate-pulse")} aria-hidden />
            ) : (
              <VolumeX className="size-3.5" aria-hidden />
            )}
            {voz.ligada ? "Voz ligada" : "Ouvir"}
          </button>
        </div>
      )}

      {/* A falha da voz não pode derrubar a conversa — o texto continua lá,
          que é a informação. Mas também não pode sumir: sem aviso, a pessoa
          fica esperando um áudio que nunca vem. */}
      {voz.erro && (
        <p className="text-right text-xs text-muted-foreground">
          A voz não está disponível agora. {voz.erro}
        </p>
      )}

      <div
        ref={scrollRef}
        className="max-h-[52vh] min-h-[220px] space-y-4 overflow-y-auto rounded-2xl border border-border/60 bg-background/40 p-4"
        aria-label="Histórico da conversa"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && !thinking && <EmptyConversation />}
        {messages.map((m, i) => (
          <ConversationMessage
            key={i}
            message={m}
            vivo={m.role === "assistant" && i === messages.length - 1}
          />
        ))}
        {thinking && (
          <div className="flex">
            <TypingIndicator />
          </div>
        )}
      </div>
    </div>
  );
});
