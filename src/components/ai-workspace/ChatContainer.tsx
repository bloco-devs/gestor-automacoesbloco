import { memo, useEffect, useRef } from "react";
import { ConversationMessage } from "./ConversationMessage";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyConversation } from "./EmptyConversation";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  messages: ChatMsg[];
  thinking: boolean;
}

export const ChatContainer = memo(function ChatContainer({ messages, thinking }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  return (
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
  );
});
