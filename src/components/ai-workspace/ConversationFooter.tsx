import { memo } from "react";

interface Props {
  turnsUsed: number;
  maxTurns: number;
  phase: string;
}

export const ConversationFooter = memo(function ConversationFooter({ turnsUsed, maxTurns, phase }: Props) {
  return (
    <p className="pt-2 text-center text-[11px] text-muted-foreground">
      {phase === "welcome"
        ? "Enter envia · Shift+Enter quebra linha"
        : phase === "processing"
        ? "Organizando as informações da sua demanda…"
        : `Interações usadas: ${Math.min(turnsUsed, maxTurns)}/${maxTurns} — Enter envia · Shift+Enter quebra linha`}
    </p>
  );
});
