import { Link } from "react-router-dom";
import { Pencil, LifeBuoy, Activity, Gauge, TrendingUp, Wrench, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { FREQUENCIA_LABEL } from "@/lib/types";
import type { DemandaCardProps } from "./types";

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("pt-BR"); } catch { return ""; }
}

export function CardPainelModerno({ solicitacao: s, onOpen, onAbrirChamado, editHref }: DemandaCardProps) {
  const metrics = [
    { icon: Activity, label: "Frequência", value: FREQUENCIA_LABEL[s.frequencia] },
    { icon: Gauge, label: "Complexidade", value: `${s.complexidade}/5` },
    { icon: TrendingUp, label: "Retorno", value: `${s.retorno}/5` },
    { icon: Wrench, label: "Dificuldade", value: `${s.dificuldade}/5` },
  ];
  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); }
      }}
      className="surface-1 cursor-pointer overflow-hidden transition-colors hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="bg-muted/40 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold truncate">{s.titulo}</h3>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.descricao}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Calendar className="size-3" /> {formatDate(s.updatedAt || s.createdAt)}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {metrics.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-md border bg-background/40 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <Icon className="size-3" /> {label}
              </div>
              <div className="text-sm font-medium mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        <StatusTimeline current={s.status} compact />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t p-3" onClick={(e) => e.stopPropagation()}>
        <Button asChild size="sm" variant="ghost">
          <Link to={editHref}><Pencil className="size-4" /> Editar</Link>
        </Button>
        <Button size="sm" onClick={onAbrirChamado}>
          <LifeBuoy className="size-4" /> Abrir chamado
        </Button>
      </div>
    </Card>
  );
}
