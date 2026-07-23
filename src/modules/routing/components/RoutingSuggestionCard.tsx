import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Sparkles, UserPlus, Layers } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Ranking, ScoredCandidate } from "../types";
import { confidenceClass, confidenceLabel, initialsOf } from "../utils/format";
import { findSystemEntry, systemAffinityPercent } from "../engine/system-fit";

interface Props {
  ranking: Ranking;
  isLoading?: boolean;
  onAssign: (userId: string) => void;
  isAssigning?: boolean;
  disabled?: boolean;
  /** F018.4 — sistema alvo da demanda; habilita o painel de afinidade. */
  systemSlug?: string | null;
}

function CandidateRow({
  s,
  onAssign,
  isAssigning,
  disabled,
  primary = false,
  systemSlug,
}: {
  s: ScoredCandidate;
  onAssign: (userId: string) => void;
  isAssigning?: boolean;
  disabled?: boolean;
  primary?: boolean;
  systemSlug?: string | null;
}) {
  const c = s.candidate;
  const name = c.nome || c.email || "Sem nome";
  const sysEntry = systemSlug ? findSystemEntry({ system_slug: systemSlug }, c) : null;
  const sysAff = sysEntry ? systemAffinityPercent(sysEntry) : 0;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-3",
        primary ? "bg-primary/5 border-primary/30" : "bg-card border-border/60",
      )}
    >
      <Avatar className="size-9 shrink-0">
        {c.avatar_url && <AvatarImage src={c.avatar_url} alt={name} />}
        <AvatarFallback className="text-[11px]">{initialsOf(c.nome, c.email ?? c.user_id)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{name}</span>
          <Badge variant="outline" className={cn("h-5 text-[10px]", confidenceClass(s.confidence))}>
            Score {s.score}
          </Badge>
          {primary && (
            <Badge variant="outline" className="h-5 text-[10px] border-primary/40 text-primary bg-primary/10">
              {confidenceLabel(s.confidence)}
            </Badge>
          )}
        </div>
        {s.reasons.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {s.reasons.join(" · ")}
          </p>
        )}
        {sysEntry && (
          <div
            className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2"
            aria-label="Afinidade neste sistema"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
              <Layers className="size-3" aria-hidden />
              Especialista neste sistema
              <span className="ml-auto tabular-nums">{sysAff}%</span>
            </div>
            <Progress value={sysAff} className="mt-1 h-1" />
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground tabular-nums">
              <span>{sysEntry.total} demandas</span>
              <span>
                {Math.round((sysEntry.success / Math.max(1, sysEntry.total)) * 100)}% sucesso
              </span>
              {sysEntry.avg_resolution_h > 0 && (
                <span>
                  Tempo médio{" "}
                  {sysEntry.avg_resolution_h < 1
                    ? `${Math.round(sysEntry.avg_resolution_h * 60)}m`
                    : `${sysEntry.avg_resolution_h.toFixed(1)}h`}
                </span>
              )}
              {(sysEntry.documentation ?? 0) > 0 && (
                <span>{sysEntry.documentation} artigos</span>
              )}
            </div>
          </div>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant={primary ? "default" : "outline"}
        className="h-8 gap-1.5 shrink-0"
        disabled={disabled || isAssigning}
        onClick={() => onAssign(c.user_id)}
      >
        <UserPlus className="size-3.5" /> Atribuir
      </Button>
    </div>
  );
}

export function RoutingSuggestionCard({ ranking, isLoading, onAssign, isAssigning, disabled, systemSlug }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Bot className="size-3.5 animate-pulse" /> Analisando melhor responsável…
      </div>
    );
  }
  if (!ranking.top) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        Nenhum candidato elegível para sugerir agora.
      </div>
    );
  }

  return (
    <section aria-label="Sugestão inteligente de responsável" className="space-y-2">
      <header className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" aria-hidden />
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sugestão da IA
        </h4>
      </header>
      <CandidateRow
        s={ranking.top}
        onAssign={onAssign}
        isAssigning={isAssigning}
        disabled={disabled}
        primary
        systemSlug={systemSlug}
      />
      {ranking.alternatives.length > 0 && (
        <>
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? "Ocultar" : `Ver ${ranking.alternatives.length} alternativa(s)`}
          </button>
          {expanded && (
            <div className="space-y-2">
              {ranking.alternatives.map((s) => (
                <CandidateRow
                  key={s.candidate.user_id}
                  s={s}
                  onAssign={onAssign}
                  isAssigning={isAssigning}
                  disabled={disabled}
                  systemSlug={systemSlug}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default RoutingSuggestionCard;
