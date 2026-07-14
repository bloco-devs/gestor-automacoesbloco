import { Check } from "lucide-react";

export interface WizardStepDef {
  key: string;
  label: string;
  optional?: boolean;
}

interface Props {
  steps: WizardStepDef[];
  currentIndex: number;
  skipped: Set<string>;
}

export function WizardStepper({ steps, currentIndex, skipped }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2 text-xs">
      {steps.map((s, i) => {
        const active = i === currentIndex;
        const done = i < currentIndex && !skipped.has(s.key);
        const isSkipped = skipped.has(s.key);
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-medium border ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary bg-primary/10 text-primary"
                    : isSkipped
                      ? "border-muted-foreground/30 bg-muted text-muted-foreground line-through"
                      : "border-muted-foreground/30 bg-background text-muted-foreground"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={`whitespace-nowrap ${
                active ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
              {s.optional ? <em className="not-italic text-muted-foreground/70"> (opcional)</em> : null}
            </span>
            {i < steps.length - 1 ? (
              <span aria-hidden className="mx-1 text-muted-foreground/40">
                ›
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
