import { useState } from "react";
import { Flag } from "lucide-react";
import { PageShell, PageHeader, Section, EmptyPanel, Toolbar } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlags, type FlagScope } from "@/modules/feature-flags";

export default function FeatureFlagsPage() {
  const { flags, setFlag, removeFlag } = useFeatureFlags();
  const [newKey, setNewKey] = useState("");
  const [newScope, setNewScope] = useState<FlagScope>("global");
  const [newDesc, setNewDesc] = useState("");

  const create = () => {
    if (!newKey.trim()) return;
    setFlag({ key: newKey.trim(), enabled: false, scope: newScope, description: newDesc });
    setNewKey("");
    setNewDesc("");
  };

  return (
    <PageShell>
      <PageHeader
        title="Feature Flags"
        subtitle="Ativação seletiva de funcionalidades. Nenhuma feature existente depende deste painel."
        icon={<Flag className="h-6 w-6" />}
      />

      <Section title="Criar flag">
        <Toolbar>
          <Input placeholder="chave (ex: portal.beta)" value={newKey} onChange={(e) => setNewKey(e.target.value)} className="max-w-xs" />
          <Input placeholder="descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="max-w-sm" />
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={newScope}
            onChange={(e) => setNewScope(e.target.value as FlagScope)}
            aria-label="Escopo"
          >
            {["global", "developer", "admin", "builder", "requester"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button size="sm" onClick={create}>Adicionar</Button>
        </Toolbar>
      </Section>

      <Section title="Flags configuradas">
        {flags.length === 0 ? (
          <EmptyPanel title="Nenhuma flag criada" description="Crie a primeira flag acima. Persistência inicial em localStorage." />
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {flags.map((f) => (
              <li key={f.key} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{f.key}</span>
                    <Badge variant="outline" className="text-[10px]">{f.scope}</Badge>
                  </div>
                  {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                </div>
                <Switch checked={f.enabled} onCheckedChange={(v) => setFlag({ key: f.key, enabled: v })} aria-label={`Ativar ${f.key}`} />
                <Button variant="ghost" size="sm" onClick={() => removeFlag(f.key)}>Remover</Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </PageShell>
  );
}
