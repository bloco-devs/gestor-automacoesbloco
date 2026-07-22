import { useState } from "react";
import { Bot, ChevronDown, ChevronUp, Sparkles, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Ranking, ScoredCandidate } from "../types";
import { confidenceClass, confidenceLabel, initialsOf } from "../utils/format";

interface Props {
  ranking: Ranking;
  isLoading?: boolean;
  onAssign: (userId: string) => void;
  isAssigning?: boolean;
  disabled?: boolean;
}

function CandidateRow({
  s,
  onAssign,
  isAssigning,
  disabled,
  primary = false,
}: {
  s: ScoredCandidate;
  onAssign: (userId: string) => void;
  isAssigning?: boolean;
  disabled?: boolean;
  primary?: boolean;
}) {
  const c = s.candidate;
  const name = c.nome || c.email || "Sem nome";
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

export function RoutingSuggestionCard({ ranking, isLoading, onAssign, isAssigning, disabled }: Props) {
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
