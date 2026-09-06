import { lazy, Suspense, useMemo } from "react";
import { Shield, ShieldAlert, Activity, KeyRound, Users, FileWarning, FileCode2, Cog, Bug, Boxes, Sparkles, Workflow, Radar, Network } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { computeSecurityScore } from "@/modules/security";
import { useAuditHistory } from "@/modules/audit";
import { useErrorHistory } from "@/modules/errors";
import { useThreatHistory } from "@/modules/security";
import { FRAMEWORKS, scoreFramework } from "@/modules/security";
import { collectRuntimeHealth } from "@/modules/platform-health";

const IntegrityPreview = lazy(() => import("./SecurityIntegrity").then((m) => ({ default: m.IntegrityInline })));

export default function SecurityCenterPage() {
  const audit = useAuditHistory();
  const errors = useErrorHistory();
  const threats = useThreatHistory();

  const score = useMemo(() => computeSecurityScore(), [audit.length, errors.length, threats.length]);
  const runtime = useMemo(() => collectRuntimeHealth(), []);
  const complianceAvg = useMemo(
    () => Math.round(FRAMEWORKS.reduce((s, fw) => s + scoreFramework(fw), 0) / FRAMEWORKS.length),
    [],
  );
  const runtimeRed = runtime.filter((r) => r.status === "red").length;
  const runtimeAmber = runtime.filter((r) => r.status === "amber").length;

  return (
    <PageShell>
      <PageHeader
        title="Security Center"
        subtitle="Segurança · Compliance · LGPD · Auditoria · Integridade · Governança."
        icon={<Shield className="size-6" aria-hidden />}
      />

      <KpiRow>
        <StatCard label="Security Score" value={`${score.overall}`} icon={ShieldAlert} tone={score.overall >= 90 ? "success" : score.overall >= 75 ? "info" : "warning"} hint="0–100 · ponderado por 15 categorias" />
        <StatCard label="Compliance" value={`${complianceAvg}%`} icon={FileWarning} tone={complianceAvg >= 85 ? "success" : "warning"} hint="Média dos 5 frameworks" />
        <StatCard label="LGPD" value={`${scoreFramework(FRAMEWORKS[0])}%`} icon={FileWarning} tone="info" hint="Cobertura calculada" />
        <StatCard label="Sessions" value="Ativas" icon={Users} tone="success" hint="Timeout de 8s no boot" />
        <StatCard label="Audit" value={audit.length} icon={FileCode2} tone="neutral" hint="Eventos no ring buffer" />
        <StatCard label="Secrets" value="OK" icon={KeyRound} tone="success" hint="Sensíveis apenas em Edge" />
        <StatCard label="Feature Flags" value="Ativa" icon={FileCode2} tone="info" hint="Store client-side" />
        <StatCard label="Plugins" value={runtime.find((r) => r.id === "plugin-host")?.detail ?? "—"} icon={Boxes} tone="neutral" />
        <StatCard label="SDK" value="1.0.0" icon={Sparkles} tone="success" />
        <StatCard label="Service Mesh" value={runtime.find((r) => r.id === "mesh")?.detail ?? "—"} icon={Network} tone={runtimeRed ? "danger" : runtimeAmber ? "warning" : "success"} />
        <StatCard label="AI Runtime" value="Ativo" icon={Sparkles} tone="success" />
        <StatCard label="Workflow" value="Ativo" icon={Workflow} tone="success" />
        <StatCard label="Event Bus" value="Ativo" icon={Activity} tone="success" />
      </KpiRow>

      <Section title="Recomendações">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {score.recommendations.map((r, i) => (<li key={i}>{r}</li>))}
        </ul>
      </Section>

      {/* O botão levava ao Integrity Center, que saiu junto com o grupo
          Governança. A prévia continua aqui, que é onde ela era lida. */}
      <Section title="Integridade rápida" description="Achados atuais de integridade.">
        <Suspense fallback={<div className="ds-caption text-muted-foreground">Carregando…</div>}>
          <IntegrityPreview limit={5} />
        </Suspense>
      </Section>
    </PageShell>
  );
}
