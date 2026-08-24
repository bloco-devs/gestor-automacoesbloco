import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tomDaEtapa } from "@/domain/demand";
import type { EtapaDaFonte } from "@/modules/demand-access";
import { PALETA } from "../components/KanbanCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StatusStepperProps {
  statusAtualId: string;
  etapas: EtapaDaFonte[];
  onMoverStatus: (statusId: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function StatusStepper({
  statusAtualId,
  etapas,
  onMoverStatus,
  disabled = false,
  className,
}: StatusStepperProps) {
  const [salvando, setSalvando] = useState(false);

  if (etapas.length === 0) return null;

  const idxAtual = etapas.findIndex((e) => e.id === statusAtualId);
  const etapaAtual = etapas[idxAtual] ?? { id: statusAtualId, rotulo: statusAtualId };

  const etapaAnterior = idxAtual > 0 ? etapas[idxAtual - 1] : null;
  const proximaEtapa = idxAtual >= 0 && idxAtual < etapas.length - 1 ? etapas[idxAtual + 1] : null;

  const tom = tomDaEtapa(etapaAtual.rotulo);
  const tinta = PALETA[tom];

  const handleMover = async (novoStatusId: string) => {
    if (disabled || salvando || novoStatusId === statusAtualId) return;
    setSalvando(true);
    try {
      await onMoverStatus(novoStatusId);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <button
        type="button"
        disabled={disabled || salvando || !etapaAnterior}
        onClick={() => etapaAnterior && void handleMover(etapaAnterior.id)}
        title={etapaAnterior ? `Mover para ${etapaAnterior.rotulo}` : "Primeira etapa"}
        aria-label={etapaAnterior ? `Mover para ${etapaAnterior.rotulo}` : "Primeira etapa"}
        className={cn(
          "flex size-7 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled || salvando}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-medium transition-colors",
              tinta.pastilha,
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {salvando ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <span className="truncate max-w-[120px]">{etapaAtual.rotulo}</span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {etapas.map((etapa) => {
            const eTom = tomDaEtapa(etapa.rotulo);
            const eTinta = PALETA[eTom];
            const EIcone = eTinta.icone;
            const selecionado = etapa.id === statusAtualId;

            return (
              <DropdownMenuItem
                key={etapa.id}
                onClick={() => void handleMover(etapa.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  aria-hidden
                  className={cn("flex size-4 shrink-0 items-center justify-center rounded", eTinta.fundo)}
                >
                  <EIcone className={cn("size-2.5", eTinta.texto)} />
                </span>
                <span className="flex-1 truncate">{etapa.rotulo}</span>
                {selecionado && <Check className="size-3.5 text-primary" aria-hidden />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        disabled={disabled || salvando || !proximaEtapa}
        onClick={() => proximaEtapa && void handleMover(proximaEtapa.id)}
        title={proximaEtapa ? `Mover para ${proximaEtapa.rotulo}` : "Última etapa"}
        aria-label={proximaEtapa ? `Mover para ${proximaEtapa.rotulo}` : "Última etapa"}
        className={cn(
          "flex size-7 items-center justify-center rounded-md border border-border/70 bg-card text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
