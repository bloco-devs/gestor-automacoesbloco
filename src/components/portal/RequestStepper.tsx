import {
  CheckCircle2,
  Circle,
  Loader2,
  FileText,
  Sparkles,
  UserCheck,
  Wrench,
  FlaskConical,
  PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DemandStatus } from "@/modules/demands/types";

interface StepMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  responsavel?: string;
  when?: string;
}

const STEPS: StepMeta[] = [
  { key: "criada", label: "Solicitação criada", icon: FileText, description: "Recebemos seu pedido." },
  { key: "analise", label: "IA analisou", icon: Sparkles, description: "Classificação e prioridade definidas." },
  { key: "responsavel", label: "Encaminhada", icon: UserCheck, description: "Direcionada ao time responsável." },
  { key: "dev", label: "Em atendimento", icon: Wrench, description: "Time trabalhando na resolução." },
  { key: "testes", label: "Em testes", icon: FlaskConical, description: "Validação antes da entrega." },
  { key: "concluido", label: "Concluída", icon: PartyPopper, description: "Tudo pronto para você." },
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
  responsavel?: string | null;
  updatedAt?: string | null;
}

/**
 * Timeline vertical premium — ícone, hora, responsável e descrição por etapa.
 */
export function RequestStepper({ status, responsavel, updatedAt }: Props) {
  const active = currentIndex(status);
  const isDone = status === "concluido";
  const when = updatedAt
    ? new Date(updatedAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <ol className="relative space-y-0" aria-label="Andamento da solicitação">
      {STEPS.map((step, i) => {
        const done = i < active || (isDone && i <= active);
        const current = i === active && !isDone;
        const Icon = step.icon;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={`absolute left-[19px] top-10 bottom-0 w-px ${
                  done ? "bg-emerald-500/40" : "bg-border"
                }`}
              />
            )}
            <span
              aria-hidden
              className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border transition ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : current
                    ? "border-primary/50 bg-primary/15 text-primary shadow-elev-1"
                    : "border-border bg-muted text-muted-foreground"
              }`}
            >
              {current ? (
                <Loader2 className="size-4 animate-spin" />
              ) : done ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-1.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p
                  className={`text-sm ${
                    current
                      ? "font-semibold text-foreground"
                      : done
                        ? "text-foreground/90"
                        : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {current && when && (
                  <span className="text-xs text-muted-foreground">· {when}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {step.description}
              </p>
              {current && responsavel && (
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">Responsável:</span>{" "}
                  <span className="font-medium">{responsavel}</span>
                </p>
              )}
            </div>
          </li>
        );
      })}
      {!isDone && (
        <li className="flex gap-4 opacity-40">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-transparent text-muted-foreground"
          >
            <Circle className="size-3" />
          </span>
          <p className="pt-3 text-xs text-muted-foreground">
            Continuaremos avisando por aqui.
          </p>
        </li>
      )}
    </ol>
  );
}
