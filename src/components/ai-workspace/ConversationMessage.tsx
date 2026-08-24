import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/blink/Blink";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  message: ChatMsg & { timestamp?: string };
  vivo?: boolean;
}

function iniciaisDe(nome: string | undefined): string {
  return (nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function horaFormatada(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export const ConversationMessage = memo(function ConversationMessage({ message, vivo }: Props) {
  const { user } = useAuth();
  const isUser = message.role === "user";
  const time = message.timestamp || horaFormatada();

  return (
    <div className={cn("flex gap-3 px-1 my-1.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser ? (
        <span className="mt-0.5 size-8 shrink-0 overflow-hidden rounded-full border border-border/80 bg-background shadow-xs">
          <Blink className="size-full" animado={vivo} />
        </span>
      ) : (
        <span className="mt-0.5 size-8 shrink-0 overflow-hidden rounded-full border border-border/80 bg-muted">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.nome ?? "Usuário"} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-[10px] font-bold text-muted-foreground">
              {iniciaisDe(user?.nome)}
            </span>
          )}
        </span>
      )}

      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground">
          <span>{isUser ? "Você" : "Blink (Atendente)"}</span>
          <span className="text-[10px] opacity-70">{time}</span>
        </div>

        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-xs",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-xs font-normal"
              : "bg-card border border-border/80 text-foreground rounded-tl-xs",
          )}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
});
