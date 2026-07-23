import { memo } from "react";
import { FileWarning, GitBranch, Network, ShieldCheck, TrendingUp, UserX } from "lucide-react";
import { KpiRow, Section, StatCard } from "@/design-system";
import { Card } from "@/components/ui/card";
import { useEcossistemaSaude } from "@/modules/ecossistema/hooks/useEcossistemaSaude";

/**
 * Analytics — seção "Ecossistema".
 * Dados reais (sem heurística) vindos de `useEcossistemaSaude`.
 * Não cria novo Analytics: apenas adiciona uma section ao pipeline existente.
 */
export const EcossistemaSection = memo(function EcossistemaSection() {
  const s = useEcossistemaSaude();

  const top = s.sistemas.slice(0, 8);
  const semDoc = s.sistemas.filter((x) => !x.temDocumentacao).slice(0, 6);

  return (
    <Section
      id="analytics-ecossistema"
      title="Ecossistema"
      description="Reaproveitamento, saúde, crescimento e dependências reais do catálogo."
    >
      <KpiRow>
        <StatCard label="Sistemas ativos" value={s.totalSistemas} icon={Network} />
        <StatCard
          label="Reaproveitamento"
          value={`${s.taxaReaproveitamento.toFixed(1)}%`}
          hint={`${s.totalReaproveitados} demandas atendidas por sistema existente`}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Duplicatas evitadas"
          value={s.demandasEvitadasLocal}
          hint="Portal (prevenção)"
          icon={GitBranch}
          tone="info"
        />
        <StatCard
          label="Sem documentação"
          value={s.semDocumentacao}
          icon={FileWarning}
          tone={s.semDocumentacao > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Sem responsável"
          value={s.semResponsavel}
          icon={UserX}
          tone={s.semResponsavel > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Maior crescimento"
          value={s.maiorCrescimento ? `${Math.round(s.maiorCrescimento.crescimentoPct)}%` : "—"}
          hint={s.maiorCrescimento?.nome ?? "sem dados"}
          icon={TrendingUp}
          tone="info"
        />
      </KpiRow>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 mt-3">
        <Card className="p-4">
          <h3 className="ds-h3 mb-2">Sistemas mais utilizados</h3>
          {top.length === 0 ? (
            <p className="ds-caption text-muted-foreground">Sem dados no período.</p>
          ) : (
            <ul className="space-y-1.5">
              {top.map((r) => (
                <li key={r.slug} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">
                    {r.nome}
                    {r.grupo ? (
                      <span className="ds-caption text-muted-foreground"> · {r.grupo}</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {r.demandasTotal} demandas · {r.reaproveitamentos} reaprov.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="ds-h3 mb-2">Precisam de documentação</h3>
          {semDoc.length === 0 ? (
            <p className="ds-caption text-muted-foreground">Todos os sistemas com demanda têm doc.</p>
          ) : (
            <ul className="space-y-1.5">
              {semDoc.map((r) => (
                <li key={r.slug} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{r.nome}</span>
                  <span className="ds-caption text-muted-foreground shrink-0">
                    {r.demandasTotal} demandas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {s.error ? (
        <p className="ds-caption text-destructive mt-2">Falha parcial: {s.error}</p>
      ) : null}
    </Section>
  );
});
