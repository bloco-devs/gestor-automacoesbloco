import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { DEVELOPER_ROUTES } from "@/modules/developer-center/routes";
import { getEnvironmentInfo } from "@/modules/developer-center/environment";
import { collectObservabilityOverview } from "@/modules/observability";
import { StatCard } from "@/design-system/patterns/StatCard";
import { Activity, Boxes, Cpu, Layers, Wrench } from "lucide-react";

export default function DeveloperCenter() {
  const env = useMemo(() => getEnvironmentInfo(), []);
  const overview = useMemo(() => collectObservabilityOverview(), []);

  return (
    <DeveloperShell
      title="Developer Center"
      description="Ferramentas de diagnóstico, inspeção e produtividade — reutilizando toda a infraestrutura existente. Somente leitura."
    >
      <section className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Modo" value={env.mode} tone={env.dev ? "warning" : "success"} icon={Cpu} />
        <StatCard label="Serviços (Mesh)" value={overview.services} icon={Layers} />
        <StatCard label="Plugins" value={overview.plugins} tone={overview.pluginsError ? "danger" : "neutral"} icon={Boxes} />
        <StatCard label="AI Skills" value={overview.aiSkills} icon={Activity} />
        <StatCard label="Traces" value={overview.traces} icon={Wrench} />
      </section>

      <Card className="p-4 space-y-3">
        <h2 className="ds-h3">Ambiente</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><dt className="ds-caption text-muted-foreground">Base</dt><dd className="font-mono">{env.base}</dd></div>
          <div><dt className="ds-caption text-muted-foreground">Online</dt><dd>{env.online ? "sim" : "não"}</dd></div>
          <div><dt className="ds-caption text-muted-foreground">Idioma</dt><dd>{env.language || "—"}</dd></div>
          <div><dt className="ds-caption text-muted-foreground">CPU cores</dt><dd>{env.hardwareConcurrency || "—"}</dd></div>
          <div><dt className="ds-caption text-muted-foreground">Memória (GB)</dt><dd>{env.deviceMemory ?? "—"}</dd></div>
          <div><dt className="ds-caption text-muted-foreground">Tela</dt><dd>{env.screen.w}×{env.screen.h} @{env.screen.dpr}x</dd></div>
          <div className="col-span-2 md:col-span-4">
            <dt className="ds-caption text-muted-foreground">User Agent</dt>
            <dd className="font-mono text-xs break-all">{env.userAgent}</dd>
          </div>
        </dl>
      </Card>

      <section>
        <h2 className="ds-h3 mb-3">Painéis</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {DEVELOPER_ROUTES.filter((r) => r.to !== "/developer").map((r) => (
            <NavLink key={r.to} to={r.to} className="group">
              <Card className="p-4 h-full transition-colors hover:border-primary/50">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-medium group-hover:text-primary">{r.label}</h3>
                  <Badge variant="outline" className="text-[10px]">Onda {r.wave}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </Card>
            </NavLink>
          ))}
        </div>
      </section>
    </DeveloperShell>
  );
}
