import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router-dom";
import { Shield, ShieldAlert, Activity, KeyRound, Users, FileWarning, FileCode2, Cog, Bug, Boxes, Sparkles, Workflow, Radar, Network } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { computeSecurityScore } from "@/modules/security";
import { useAuditHistory } from "@/modules/audit";
import { useErrorHistory } from "@/modules/errors";
import { useThreatHistory } from "@/modules/security";
import { FRAMEWORKS, scoreFramework } from "@/modules/security";
import { collectRuntimeHealth } from "@/modules/platform-health";
import { Button } from "@/components/ui/button";

const IntegrityPreview = lazy(() => import("./SecurityIntegrity").then((m) => ({ default: m.IntegrityInline })));

const NAV: Array<{ href: string; label: string; description: string }> = [
  { href: "/admin/security/threats", label: "Threat Center", description: "Ameaças, falhas de auth, plugins rejeitados." },
  { href: "/admin/security/compliance", label: "Compliance", description: "LGPD · ISO 27001 · OWASP · SOC2 · NIST." },
  { href: "/admin/security/permissions", label: "Permissions", description: "Explorer de roles, capabilities e extensões." },
  { href: "/admin/security/policies", label: "Policy Center", description: "Cadastro de políticas de segurança." },
  { href: "/admin/security/integrity", label: "Integrity", description: "Assinaturas, versões, providers e slots." },
  { href: "/admin/security/timeline", label: "Timeline", description: "Trilha unificada de eventos." },
  { href: "/admin/security/reports", label: "Enterprise Reports", description: "Exportação CSV consolidada." },
];

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
        icon={<Shield className="h-6 w-6" aria-hidden />}
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

      <Section title="Áreas do Security Center">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {NAV.map((n) => (
            <Link key={n.href} to={n.href} className="rounded-2xl border p-4 hover:bg-muted/40 transition-colors">
              <div className="ds-h3 mb-1 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" aria-hidden /> {n.label}</div>
              <p className="ds-caption text-muted-foreground">{n.description}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Recomendações">
        <ul className="list-disc pl-5 space-y-1 text-sm">
          {score.recommendations.map((r, i) => (<li key={i}>{r}</li>))}
        </ul>
      </Section>

      <Section title="Integridade rápida" description="Prévia dos achados atuais do Integrity Center.">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
          <IntegrityPreview limit={5} />
        </Suspense>
        <div className="mt-3">
          <Button asChild variant="outline" size="sm"><Link to="/admin/security/integrity">Abrir Integrity Center</Link></Button>
        </div>
      </Section>
    </PageShell>
  );
}
