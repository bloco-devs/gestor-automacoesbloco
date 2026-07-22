import { useMemo, useState } from "react";
import { Boxes, Search, Layers as LayersIcon, ExternalLink } from "lucide-react";
import { PageShell, PageHeader, Section, StatCard, KpiRow } from "@/design-system";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEcossistemaSistemas } from "@/hooks/useEcossistemaSistemas";
import { cn } from "@/lib/utils";

export default function EcossistemaPage() {
  const { sistemas, fonte, loading } = useEcossistemaSistemas(true);
  const [q, setQ] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const set = new Set<string>();
    sistemas.forEach((s) => s.grupo && set.add(s.grupo));
    return Array.from(set).sort();
  }, [sistemas]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sistemas.filter((s) => {
      if (grupo && s.grupo !== grupo) return false;
      if (!query) return true;
      return s.nome.toLowerCase().includes(query) || s.id.toLowerCase().includes(query);
    });
  }, [sistemas, q, grupo]);

  return (
    <PageShell>
      <PageHeader
        title="Ecossistema"
        subtitle="Catálogo de sistemas e integrações do Bloco (estilo Backstage)."
        actions={
          <Badge variant={fonte === "hub" ? "default" : "outline"}>
            {fonte === "hub" ? "Ao vivo (HUB)" : fonte === "semente" ? "Semente" : loading ? "Carregando…" : "—"}
          </Badge>
        }
      />

      <Section>
        <KpiRow>
          <StatCard label="Sistemas" value={sistemas.length} icon={Boxes} />
          <StatCard label="Grupos" value={grupos.length} icon={LayersIcon} tone="info" />
          <StatCard label="Fonte" value={fonte === "hub" ? "HUB" : "Local"} tone={fonte === "hub" ? "success" : "warning"} />
          <StatCard label="Filtrados" value={filtered.length} />
        </KpiRow>
      </Section>

      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-md">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar sistema…" className="pl-8" />
          </div>
          <Button size="sm" variant={grupo === null ? "default" : "outline"} onClick={() => setGrupo(null)}>Todos</Button>
          {grupos.map((g) => (
            <Button key={g} size="sm" variant={grupo === g ? "default" : "outline"} onClick={() => setGrupo(g)}>{g}</Button>
          ))}
        </div>
      </Section>

      <Section title="Sistemas">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((s) => (
            <Card key={s.id} className={cn("surface-1 hover:shadow-md transition-shadow")}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="truncate">{s.nome}</span>
                  {s.grupo && <Badge variant="secondary" className="text-[10px]">{s.grupo}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono truncate">{s.id}</p>
                {s.status && <Badge variant="outline" className="text-[10px]">{s.status}</Badge>}
                <Button asChild variant="ghost" size="sm" className="w-full justify-between px-2 mt-1">
                  <a href={`/diagrama?sistema=${encodeURIComponent(s.id)}`}>
                    Ver no diagrama
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">Nenhum sistema encontrado.</p>
          )}
        </div>
      </Section>
    </PageShell>
  );
}
