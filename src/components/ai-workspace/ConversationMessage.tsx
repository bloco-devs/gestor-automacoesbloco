import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/blink/Blink";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  message: ChatMsg;
}

/**
 * QUEM ESTÁ FALANDO PRECISA TER ROSTO
 *
 * Antes: dois ícones genéricos do mesmo conjunto — um robô e uma silhueta de
 * pessoa. Nenhum dos dois dizia quem era. A silhueta era a mesma para todo
 * mundo, mesmo para quem já tinha subido uma foto de perfil; o robô era o
 * mesmo de qualquer aplicativo.
 *
 * Agora a IA tem o rosto do Blink, constante em toda conversa, e a pessoa vê
 * a própria foto quando tem uma. Sem foto, as iniciais — que ainda são dela,
 * ao contrário de uma silhueta anônima.
 */
function iniciaisDe(nome: string | undefined): string {
  return (nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export const ConversationMessage = memo(function ConversationMessage({ message }: Props) {
  const { user } = useAuth();
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="mt-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/60">
          <Blink className="size-7" />
        </span>
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
        <span className="mt-1 size-8 shrink-0 overflow-hidden rounded-full">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.nome} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center bg-muted text-[11px] font-medium text-muted-foreground">
              {iniciaisDe(user?.nome)}
            </span>
          )}
        </span>
      )}
    </div>
  );
});
