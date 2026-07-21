import { memo } from "react";
import { Bug, Lightbulb, Cog, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  emoji: string;
  icon: typeof Bug;
  title: string;
  prompt: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "problema",
    emoji: "🐞",
    icon: Bug,
    title: "Relatar um problema",
    prompt: "Quero relatar um problema: ",
  },
  {
    id: "melhoria",
    emoji: "💡",
    icon: Lightbulb,
    title: "Sugerir uma melhoria",
    prompt: "Tenho uma sugestão de melhoria: ",
  },
  {
    id: "automacao",
    emoji: "⚙️",
    icon: Cog,
    title: "Solicitar uma automação",
    prompt: "Preciso automatizar o seguinte processo: ",
  },
  {
    id: "funcionalidade",
    emoji: "✨",
    icon: Sparkles,
    title: "Nova funcionalidade",
    prompt: "Gostaria de solicitar uma nova funcionalidade: ",
  },
  {
    id: "duvida",
    emoji: "📚",
    icon: BookOpen,
    title: "Tirar uma dúvida",
    prompt: "Tenho uma dúvida sobre: ",
  },
];

interface Props {
  onPick: (action: QuickAction) => void;
  disabled?: boolean;
  className?: string;
}

export const QuickActions = memo(function QuickActions({ onPick, disabled, className }: Props) {
  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
      role="list"
      aria-label="Ações rápidas"
    >
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onPick(a)}
            disabled={disabled}
            role="listitem"
            aria-label={a.title}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition",
              "hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg text-primary group-hover:bg-primary/15"
            >
              {a.emoji}
            </span>
            <span className="flex flex-col">
              <span className="font-medium leading-tight">{a.title}</span>
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="size-3" aria-hidden /> começar conversa
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
});
