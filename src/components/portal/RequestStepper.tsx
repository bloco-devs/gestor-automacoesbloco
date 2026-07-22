import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { DemandStatus } from "@/modules/demands/types";

/**
 * Timeline visual "linha do tempo" para o solicitante.
 * Puramente visual — deriva o passo atual do status da demanda.
 */
const STEPS: { key: string; label: string; matches: DemandStatus[] }[] = [
  { key: "criada", label: "Solicitação criada", matches: ["backlog"] },
  { key: "analise", label: "IA analisou", matches: ["a_fazer"] },
  { key: "responsavel", label: "Responsável definido", matches: ["a_fazer"] },
  { key: "dev", label: "Em desenvolvimento", matches: ["em_desenvolvimento"] },
  { key: "testes", label: "Em testes", matches: ["em_testes", "homologacao"] },
  { key: "concluido", label: "Concluído", matches: ["concluido"] },
];

function currentIndex(status: DemandStatus): number {
  switch (status) {
    case "backlog":
      return 0;
    case "a_fazer":
      return 2;
    case "em_desenvolvimento":
      return 3;
    case "em_testes":
    case "homologacao":
      return 4;
    case "concluido":
      return 5;
    default:
      return 0;
  }
}

interface Props {
  status: DemandStatus;
}

export function RequestStepper({ status }: Props) {
  const active = currentIndex(status);
  return (
    <ol className="relative space-y-4 pl-1" aria-label="Andamento da solicitação">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active && status !== "concluido";
        const finished = status === "concluido" && i === STEPS.length - 1;
        return (
          <li key={step.key} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition ${
                done || finished
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : current
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {done || finished ? (
                <CheckCircle2 className="size-4" />
              ) : current ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Circle className="size-3" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={`text-sm ${
                  current
                    ? "font-semibold text-foreground"
                    : done || finished
                      ? "text-foreground/90"
                      : "text-muted-foreground"
                }`}
              >
                {step.label}
              </p>
              {current && (
                <p className="text-xs text-muted-foreground">Estamos cuidando disso agora.</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
