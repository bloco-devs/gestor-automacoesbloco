import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyPanelProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * DS 3.0 — EmptyPanel
 *
 * Sem borda tracejada e sem fundo cinza: um estado vazio não precisa de uma
 * caixa avisando que está vazio. Muito espaço, ícone pequeno e discreto,
 * texto curto e uma única ação evidente.
 */
export function EmptyPanel({ icon: Icon, title, description, action, className }: EmptyPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        // A entrada suave existe por um motivo prático: o vazio quase sempre
        // chega DEPOIS de um skeleton. Sem transição, o esqueleto some e o
        // texto aparece no mesmo quadro — o olho lê como falha de renderização,
        // não como resposta.
        "animate-in fade-in duration-base",
        className,
      )}
    >
      {Icon ? (
        // O ícone ganha um círculo de superfície. Solto, ele boiava no meio do
        // branco e parecia um resto de layout; contido, vira um objeto
        // deliberado — a diferença entre "não há nada" e "esqueceram algo aqui".
        <span className="flex size-10 items-center justify-center rounded-full bg-muted/60">
          <Icon className="size-[18px] text-muted-foreground/70" aria-hidden />
        </span>
      ) : null}
      <div className="space-y-1">
        <div className="ds-body-strong">{title}</div>
        {description ? (
          <p className="ds-caption mx-auto max-w-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
