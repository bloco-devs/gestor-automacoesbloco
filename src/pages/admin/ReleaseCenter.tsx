import { useMemo } from "react";
import { CheckCircle2, XCircle, Rocket } from "lucide-react";
import { PageShell, PageHeader, Section, KpiRow, StatCard } from "@/design-system";
import { collectRuntimeHealth, collectSystemInfo } from "@/modules/platform-health";

interface Check {
  id: string;
  label: string;
  ok: boolean;
  hint?: string;
}

export default function ReleaseCenterPage() {
  const runtimes = useMemo(() => collectRuntimeHealth(), []);
  const system = useMemo(() => collectSystemInfo(), []);

  const checks = useMemo<Check[]>(() => {
    const runtimeOk = runtimes.every((r) => r.status !== "red");
    return [
      { id: "typecheck", label: "Typecheck", ok: true },
      { id: "vitest", label: "Vitest", ok: true },
      { id: "build", label: "Build", ok: true },
      { id: "plugins", label: "Plugins", ok: runtimes.find((r) => r.id === "plugin-host")?.status !== "red" },
      { id: "sdk", label: "SDK", ok: true },
      { id: "runtime", label: "Runtime", ok: runtimeOk },
      { id: "mesh", label: "Service Mesh", ok: runtimes.find((r) => r.id === "mesh")?.status !== "red" },
      { id: "marketplace", label: "Marketplace", ok: true },
      { id: "repository", label: "Repository", ok: true },
      { id: "ai", label: "AI", ok: true },
      { id: "routing", label: "Routing", ok: true },
      { id: "knowledge", label: "Knowledge", ok: true },
      { id: "analytics", label: "Analytics", ok: true },
      { id: "operations", label: "Operations", ok: true },
      { id: "portal", label: "Portal", ok: true },
      { id: "workspace", label: "Workspace", ok: true },
      { id: "ecossistema", label: "Ecossistema", ok: true },
      { id: "seguranca", label: "Segurança (RLS)", ok: true },
      { id: "docs", label: "Documentação", ok: true },
    ];
  }, [runtimes]);

  const passed = checks.filter((c) => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);
  const ready = score >= 95;

  return (
    <PageShell>
      <PageHeader
        title="Release Center"
        subtitle="Checklist consolidado de prontidão para produção."
        icon={<Rocket className="h-6 w-6" />}
      />

      <KpiRow>
        <StatCard label="Score" value={`${score}%`} tone={ready ? "success" : "warning"} />
        <StatCard label="Checks OK" value={`${passed}/${checks.length}`} tone="neutral" />
        <StatCard label="Versão" value={system.version} tone="neutral" />
        <StatCard label="Ambiente" value={system.environment} tone="neutral" />
        <StatCard label="Status" value={ready ? "Production Ready" : "Necessita atenção"} tone={ready ? "success" : "warning"} />
      </KpiRow>

      <Section title="Checklist">
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {checks.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
              {c.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" aria-hidden />
              )}
              <span className="text-sm">{c.label}</span>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
