import { useState } from "react";
import { Cog } from "lucide-react";
import { PageShell, PageHeader, Section, EmptyPanel, Toolbar } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAppSettings, type SettingCategory } from "@/modules/settings";

const CATEGORIES: SettingCategory[] = [
  "sistema", "portal", "workspace", "analytics", "operations",
  "plugins", "ai", "workflow", "knowledge", "routing", "sdk",
];

export default function SettingsCenterPage() {
  const { settings, setSetting, rollbackSetting } = useAppSettings();
  const [key, setKey] = useState("");
  const [cat, setCat] = useState<SettingCategory>("sistema");
  const [json, setJson] = useState("{\n  \n}");
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    try {
      const value = JSON.parse(json);
      setSetting(key.trim(), cat, value);
      setErr(null);
      setKey("");
      setJson("{\n  \n}");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "JSON inválido");
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Config Center"
        subtitle="Configurações versionadas por categoria — editor JSON com histórico e rollback."
        icon={<Cog className="size-6" />}
      />

      <Section title="Nova configuração">
        <Toolbar>
          <Input placeholder="chave" value={key} onChange={(e) => setKey(e.target.value)} className="max-w-xs" />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={cat}
            onChange={(e) => setCat(e.target.value as SettingCategory)}
            aria-label="Categoria"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button size="sm" onClick={save} disabled={!key.trim()}>Salvar</Button>
        </Toolbar>
        <Textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={5}
          className="font-mono text-xs mt-2"
          aria-label="Valor JSON"
        />
        {err && <div className="text-xs text-destructive mt-1">{err}</div>}
      </Section>

      <Section title="Configurações">
        {settings.length === 0 ? (
          <EmptyPanel title="Sem configurações" description="Adicione a primeira acima." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {settings.map((s) => (
              <li key={s.key} className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{s.key}</span>
                  <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                  <Badge variant="secondary" className="text-[10px]">v{s.version}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(s.updatedAt).toLocaleString()}
                  </span>
                </div>
                <pre className="max-h-32 overflow-auto rounded bg-muted p-2 text-[11px]">
                  {JSON.stringify(s.value, null, 2)}
                </pre>
                {s.history.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.history.map((h) => (
                      <Button
                        key={h.version}
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px]"
                        onClick={() => rollbackSetting(s.key, h.version)}
                      >
                        rollback v{h.version}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}
