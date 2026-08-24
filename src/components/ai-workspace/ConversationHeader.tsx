import { memo } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Blink } from "@/components/blink/Blink";

interface Props {
  onReset: () => void;
  showReset: boolean;
  agenteNome?: string;
  subtitulo?: string;
}

export const ConversationHeader = memo(function ConversationHeader({
  onReset,
  showReset,
  agenteNome = "Blink",
  subtitulo = "Atendimento Inteligente · Online",
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-3 shadow-xs rounded-t-2xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-xs">
            <Blink className="size-full" animado />
          </span>
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            {agenteNome}
            <Sparkles className="size-3.5 text-primary" aria-hidden />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">
            {subtitulo}
          </span>
        </div>
      </div>
      {showReset && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-1.5 text-xs font-medium border-border/80"
          aria-label="Iniciar nova conversa"
        >
          <RotateCcw className="size-3.5" /> Nova conversa
        </Button>
      )}
    </div>
  );
});
