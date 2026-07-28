import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "@/components/blink/Blink";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMsg } from "@/hooks/useAIWorkspace";

interface Props {
  message: ChatMsg;
  /**
   * Só a fala mais recente ganha o Blink em movimento.
   *
   * Animar todos os avatares faria uma conversa longa virar uma parede de
   * cabeças flutuando, cada uma no seu tempo — e o olho persegue movimento
   * antes de ler texto. Mexer só o último é o que a palavra "interagindo"
   * quer dizer: ele reage ao que acabou de acontecer, não fica performando
   * o histórico inteiro.
   */
  vivo?: boolean;
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

export const ConversationMessage = memo(function ConversationMessage({ message, vivo }: Props) {
  const { user } = useAuth();
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        // Mesmo diâmetro da foto de quem está do outro lado: dois
        // interlocutores com pesos visuais diferentes fazem um parecer
        // secundário. O Blink ocupa o círculo inteiro, sem moldura — a foto
        // da pessoa também não tem.
        <span className="mt-1 size-9 shrink-0 overflow-hidden rounded-full bg-muted/50">
          <Blink className="size-full" animado={vivo} />
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
        <span className="mt-1 size-9 shrink-0 overflow-hidden rounded-full">
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
