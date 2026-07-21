import { memo } from "react";
import { MessageCircle } from "lucide-react";

export const EmptyConversation = memo(function EmptyConversation() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
      <MessageCircle className="size-6 text-muted-foreground/60" aria-hidden />
      Sua conversa aparecerá aqui.
    </div>
  );
});
