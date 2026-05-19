import { Link } from "react-router-dom";
import { Pencil, LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { freqLabel, statusToCategory, type PipelineStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { SolicitacaoCardProps } from "./types";

const SIDE_TONE: Record<PipelineStatus, string> = {
  novo: "bg-muted-foreground/40",
  em_analise: "bg-info",
  aprovado: "bg-secondary",
  em_desenvolvimento: "bg-warning",
  testando: "bg-info",
  pronto: "bg-success",
  em_producao: "bg-accent",
};

export function CardDestaqueLateral({ solicitacao: s, onOpen, onAbrirChamado, editHref }: SolicitacaoCardProps) {
  const tone = SIDE_TONE[statusToCategory(s.status)];
  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className="surface-1 relative cursor-pointer overflow-hidden pl-4 transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={cn("absolute inset-y-0 left-0 w-1.5", tone)} />
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold truncate">{s.titulo}</h3>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.descricao}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">Freq.: <span className="font-medium text-foreground">{freqLabel(s.frequencia)}</span></span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">Complex.: <span className="font-medium text-foreground">{s.complexidade}/10</span></span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs">Retorno: <span className="font-medium text-foreground">{s.retorno}/10</span></span>
        </div>
        <StatusTimeline current={s.status} compact />
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button asChild size="sm" variant="outline">
            <Link to={editHref}><Pencil className="size-4" /> Editar</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onAbrirChamado}>
            <LifeBuoy className="size-4" /> Abrir chamado
          </Button>
        </div>
      </div>
    </Card>
  );
}
