import { Link } from "react-router-dom";
import { Pencil, LifeBuoy, Activity, Gauge, TrendingUp, Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/StatusBadge";
import { FREQUENCIA_LABEL, PIPELINE_ORDER, statusToCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { DemandaCardProps } from "./types";

export function CardCompacto({ solicitacao: s, onOpen, onAbrirChamado, editHref }: DemandaCardProps) {
  const idx = PIPELINE_ORDER.indexOf(statusToCategory(s.status));
  return (
    <TooltipProvider delayDuration={200}>
      <Card
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
        }}
        className="surface-1 cursor-pointer transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden"
      >
        <div className="flex items-center gap-3 p-3">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate font-medium text-sm">{s.titulo}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{s.descricao}</TooltipContent>
            </Tooltip>
            <StatusBadge status={s.status} />
          </div>
          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Activity className="size-3" />{FREQUENCIA_LABEL[s.frequencia]}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Gauge className="size-3" />{s.complexidade}/5</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><TrendingUp className="size-3" />{s.retorno}/5</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><Wrench className="size-3" />{s.dificuldade}/5</span>
          </div>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="ghost" className="size-8">
                  <Link to={editHref}><Pencil className="size-4" /></Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar demanda</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="size-8" onClick={onAbrirChamado}>
                  <LifeBuoy className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir chamado</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex h-1 w-full">
          {PIPELINE_ORDER.map((_, i) => (
            <div key={i} className={cn("flex-1", i <= idx ? "bg-accent" : "bg-muted", i > 0 && "border-l border-background")} />
          ))}
        </div>
      </Card>
    </TooltipProvider>
  );
}
