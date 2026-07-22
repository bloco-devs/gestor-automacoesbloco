import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

/**
 * Animação "Assistente pensando" durante a fase `processing`.
 * Passa por etapas com fade+scale. Puramente visual — não afeta a IA.
 */
const STEPS = [
  "Entendendo seu problema…",
  "Procurando soluções…",
  "Comparando chamados parecidos…",
  "Preparando melhor encaminhamento…",
];

export function ThinkingSteps({ className = "" }: { className?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i < STEPS.length - 1 ? i + 1 : i)),
      900,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border border-border bg-card/60 p-5 shadow-elev-1 ${className}`}
    >
      <ul className="space-y-2.5">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li
              key={s}
              className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                i > idx ? "opacity-40" : "opacity-100"
              }`}
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  done
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : active
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5" />
                ) : active ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span
                className={
                  active
                    ? "font-medium text-foreground animate-fade-in"
                    : done
                      ? "text-foreground/80"
                      : "text-muted-foreground"
                }
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
