import { memo } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onReset: () => void;
  showReset: boolean;
}

export const ConversationHeader = memo(function ConversationHeader({ onReset, showReset }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        Assistente Bloco
      </div>
      {showReset && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs"
          aria-label="Iniciar nova conversa"
        >
          <RotateCcw className="size-3.5" /> Nova conversa
        </Button>
      )}
    </div>
  );
});
