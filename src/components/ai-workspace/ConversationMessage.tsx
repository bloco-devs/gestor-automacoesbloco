import { memo } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  message: ChatMsg;
}

export const ConversationMessage = memo(function ConversationMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="size-4" aria-hidden />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm",
        )}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="size-4" aria-hidden />
        </div>
      )}
    </div>
  );
});
