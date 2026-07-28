import { memo, useMemo, useState } from "react";
import { Radar, ShieldAlert } from "lucide-react";
import { PageShell, PageHeader, Section, Toolbar, StatCard, KpiRow, EmptyPanel } from "@/design-system";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useThreatHistory, type ThreatSeverity } from "@/modules/security";

const SEVERITY_TONE: Record<ThreatSeverity, "info" | "warning" | "danger" | "neutral"> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

function SecurityThreatsPageImpl() {
  const threats = useThreatHistory();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string>("all");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return threats.filter((t) => {
      if (sev !== "all" && t.severity !== sev) return false;
      if (!query) return true;
      return `${t.kind} ${t.message} ${t.origin}`.toLowerCase().includes(query);
    });
  }, [threats, q, sev]);

  const counts = useMemo(
    () => ({
      total: threats.length,
      critical: threats.filter((t) => t.severity === "critical").length,
      high: threats.filter((t) => t.severity === "high").length,
      medium: threats.filter((t) => t.severity === "medium").length,
    }),
    [threats],
  );

  return (
    <PageShell>
      <PageHeader title="Threat Center" subtitle="Eventos suspeitos, falhas de auth, plugins rejeitados e capabilities negadas." icon={<Radar className="size-6" aria-hidden />} />
      <KpiRow>
        <StatCard label="Total" value={counts.total} icon={ShieldAlert} tone="neutral" />
        <StatCard label="Críticas" value={counts.critical} icon={ShieldAlert} tone="danger" />
        <StatCard label="Altas" value={counts.high} icon={ShieldAlert} tone="warning" />
        <StatCard label="Médias" value={counts.medium} icon={ShieldAlert} tone="info" />
      </KpiRow>

      <Section title="Trilha de ameaças">
        <Toolbar className="mb-3">
          <Input placeholder="Buscar por tipo, origem ou mensagem" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </Toolbar>

        {filtered.length === 0 ? (
          <EmptyPanel title="Sem ameaças registradas" description="O ring buffer está vazio ou o filtro não retornou resultados." />
        ) : (
          <div className="rounded-2xl border divide-y">
            {filtered.map((t) => (
              <div key={t.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{t.kind}</Badge>
                    <span className="ds-caption text-muted-foreground">{new Date(t.at).toLocaleString()}</span>
                    <span className="ds-caption text-muted-foreground">· {t.origin}</span>
                  </div>
                  <div className="text-sm mt-1 truncate">{t.message}</div>
                  {t.detail ? <div className="ds-caption text-muted-foreground line-clamp-2">{t.detail}</div> : null}
                </div>
                <Badge variant="outline" className={SEVERITY_TONE[t.severity] === "danger" ? "border-destructive text-destructive" : ""}>{t.severity}</Badge>
              </div>
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(SecurityThreatsPageImpl);
