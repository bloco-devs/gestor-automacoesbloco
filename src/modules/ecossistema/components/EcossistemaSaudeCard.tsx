import { memo } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, FileWarning, GitBranch, Network, TrendingUp, UserX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiRow, StatCard } from "@/design-system";
import { useEcossistemaSaude } from "../hooks/useEcossistemaSaude";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Operations — card "Saúde do Ecossistema".
 * Reutiliza StatCard/KpiRow do DS 2.0. 100% read-only.
 */
export const EcossistemaSaudeCard = memo(function EcossistemaSaudeCard() {
  const s = useEcossistemaSaude();

  const statusGeral =
    s.semDocumentacao > s.totalSistemas * 0.5
      ? { label: "Atenção", tone: "warning" as const }
      : s.comMuitasDemandas > 0
        ? { label: "Ativo", tone: "info" as const }
        : { label: "Saudável", tone: "success" as const };

  return (
    <Card className="p-4 space-y-4" aria-label="Saúde do Ecossistema">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="ds-h3 flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" aria-hidden />
            Saúde do Ecossistema
          </h3>
          <p className="ds-caption text-muted-foreground">
            {s.fonte === "hub" ? "Ao vivo (HUB)" : s.fonte === "semente" ? "Semente (fallback)" : "Carregando…"}
            {s.ultimoReprocessadoEm
              ? ` · atualizado ${formatDistanceToNow(new Date(s.ultimoReprocessadoEm), { addSuffix: true, locale: ptBR })}`
              : null}
          </p>
        </div>
        <Link to="/ecossistema" className="ds-caption text-primary underline-offset-4 hover:underline">
          Ver catálogo →
        </Link>
      </header>

      <KpiRow>
        <StatCard label="Sistemas" value={s.totalSistemas} icon={Network} tone="neutral" />
        <StatCard label="Sem doc" value={s.semDocumentacao} icon={FileWarning} tone={s.semDocumentacao > 0 ? "warning" : "neutral"} />
        <StatCard label="Sem responsável" value={s.semResponsavel} icon={UserX} tone={s.semResponsavel > 0 ? "warning" : "neutral"} />
        <StatCard label="Alta demanda" value={s.comMuitasDemandas} icon={AlertCircle} tone={s.comMuitasDemandas > 0 ? "info" : "neutral"} />
        <StatCard
          label="Maior crescimento"
          value={s.maiorCrescimento ? `${Math.round(s.maiorCrescimento.crescimentoPct)}%` : "—"}
          hint={s.maiorCrescimento?.nome ?? "sem dados"}
          icon={TrendingUp}
          tone="info"
        />
        <StatCard
          label="Status"
          value={statusGeral.label}
          icon={GitBranch}
          tone={statusGeral.tone}
        />
      </KpiRow>

      {s.error ? (
        <p className="ds-caption text-destructive">Falha parcial: {s.error}</p>
      ) : null}
    </Card>
  );
});
