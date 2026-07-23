import { memo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, FileText, GitBranch, Network, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useEcossistemaSaude } from "../hooks/useEcossistemaSaude";
import { readEcossistemaEvents } from "../utils/observability";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Command Center — painel "Ecossistema" em tempo real.
 * Reflete auto-sync (Realtime) — não faz polling.
 */
export const EcossistemaLivePanel = memo(function EcossistemaLivePanel() {
  const s = useEcossistemaSaude();

  const events = readEcossistemaEvents().slice(-6).reverse();

  return (
    <Card className="p-4 space-y-4" aria-label="Ecossistema em tempo real">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="ds-h3 flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" aria-hidden />
            Ecossistema
          </h3>
          <p className="ds-caption text-muted-foreground">Tempo real · Realtime + auto-sync</p>
        </div>
        <Link to="/ecossistema" className="ds-caption text-primary underline-offset-4 hover:underline flex items-center gap-1">
          Explorar <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric icon={Sparkles} label="Novos (7d)" value={s.novosSistemas7d.length} />
        <Metric icon={GitBranch} label="Matches recentes" value={s.matchesAtualizadosRecentes} />
        <Metric icon={FileText} label="Reaproveitamentos" value={s.totalReaproveitados} />
        <Metric icon={Activity} label="Duplicatas evitadas" value={s.demandasEvitadasLocal} />
      </div>

      <div>
        <p className="ds-label text-muted-foreground mb-1">Atividade recente</p>
        {events.length === 0 ? (
          <p className="ds-caption text-muted-foreground">Sem eventos ainda.</p>
        ) : (
          <ul className="space-y-1">
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="ds-caption flex items-center justify-between gap-2">
                <span className="truncate">
                  <span className="text-foreground">{shortLabel(e.event)}</span>
                  {typeof e.payload?.reason === "string" ? (
                    <span className="text-muted-foreground"> · {String(e.payload.reason)}</span>
                  ) : null}
                </span>
                <time className="text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(e.at), { addSuffix: true, locale: ptBR })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
});

function Metric({ icon: Icon, label, value }: { icon: typeof Network; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 p-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="ds-caption text-muted-foreground truncate">{label}</p>
        <p className="text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function shortLabel(ev: string): string {
  return ev.replace("ecossistema.", "");
}
