import { memo } from "react";

/** Bolhas pulsantes indicando que a IA está pensando. */
export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-3 py-2"
      role="status"
      aria-live="polite"
      aria-label="A IA está pensando"
    >
      <span className="sr-only">A IA está pensando</span>
      <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.3s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:-0.15s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground/70 animate-bounce" />
    </div>
  );
});
