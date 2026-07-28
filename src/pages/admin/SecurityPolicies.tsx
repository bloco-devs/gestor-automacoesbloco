import { memo, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { PageShell, PageHeader, Section, Toolbar, EmptyPanel } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePolicies, upsertPolicy, removePolicy, type PolicyCategory, type PolicyStatus } from "@/modules/security";

const CATEGORIES: PolicyCategory[] = ["access", "data", "audit", "operations", "naming", "ai", "sdk"];
const STATUS: PolicyStatus[] = ["draft", "active", "deprecated"];

function SecurityPoliciesPageImpl() {
  const policies = usePolicies();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PolicyCategory>("access");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<PolicyStatus>("draft");
  const [version, setVersion] = useState("1.0.0");

  function submit() {
    if (!title.trim()) return;
    upsertPolicy({
      id: `pol_${Date.now()}`,
      title,
      description,
      category,
      version,
      owner: owner || undefined,
      status,
    });
    setTitle("");
    setDescription("");
    setOwner("");
    setVersion("1.0.0");
  }

  return (
    <PageShell>
      <PageHeader title="Policy Center" subtitle="Cadastro client-side de políticas de segurança (preparado para Supabase)." icon={<ShieldCheck className="size-6" aria-hidden />} />

      <Section title="Nova política">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Owner (área/pessoa)" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <select className="border rounded-md px-2 py-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value as PolicyCategory)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="border rounded-md px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value as PolicyStatus)}>
            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Input placeholder="Versão (semver)" value={version} onChange={(e) => setVersion(e.target.value)} />
          <Textarea placeholder="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} className="md:col-span-2" />
        </div>
        <Toolbar className="mt-3">
          <Button onClick={submit} disabled={!title.trim()}>Adicionar</Button>
        </Toolbar>
      </Section>

      <Section title="Políticas cadastradas">
        {policies.length === 0 ? (
          <EmptyPanel title="Sem políticas" description="Cadastre a primeira política acima." />
        ) : (
          <div className="rounded-2xl border divide-y">
            {policies.map((p) => (
              <div key={p.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ds-h3">{p.title}</span>
                    <Badge variant="outline">{p.category}</Badge>
                    <Badge variant="outline" className={p.status === "active" ? "border-success text-success" : ""}>{p.status}</Badge>
                    <span className="ds-caption text-muted-foreground">v{p.version}</span>
                    {p.owner ? <span className="ds-caption text-muted-foreground">· {p.owner}</span> : null}
                  </div>
                  <div className="ds-caption text-muted-foreground mt-1">{p.description}</div>
                  <div className="ds-caption text-muted-foreground mt-1">Atualizada em {new Date(p.updatedAt).toLocaleDateString()}</div>
                </div>
                <Button variant="ghost" size="icon" aria-label="Remover política" onClick={() => removePolicy(p.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </PageShell>
  );
}

export default memo(SecurityPoliciesPageImpl);
