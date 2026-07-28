import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { FileText } from "lucide-react";

/**
 * Onda 13 — Documentation Hub.
 * Índice estático de docs/*. Fonte-de-verdade é a pasta docs/.
 */
interface DocEntry { path: string; title: string; group: string }

const DOCS: DocEntry[] = [
  { path: "docs/00-README.md", title: "README", group: "Geral" },
  { path: "docs/01-Product-Vision.md", title: "Product Vision", group: "Produto" },
  { path: "docs/02-Personas.md", title: "Personas", group: "Produto" },
  { path: "docs/04-Regras-de-Negocio.md", title: "Regras de Negócio", group: "Produto" },
  { path: "docs/05-Arquitetura.md", title: "Arquitetura", group: "Plataforma" },
  { path: "docs/08-IA.md", title: "IA (visão geral)", group: "AI" },
  { path: "docs/10-Backend.md", title: "Backend", group: "Plataforma" },
  { path: "docs/12-Seguranca.md", title: "Segurança", group: "Segurança" },
  { path: "docs/15-Design-System.md", title: "Design System", group: "DS" },
  { path: "docs/34-Design-System-2.md", title: "Design System 2.0", group: "DS" },
  { path: "docs/40-Production-Readiness.md", title: "Production Readiness", group: "Plataforma" },
  { path: "docs/42-Analytics.md", title: "Analytics", group: "Produto" },
  { path: "docs/51-Platform-SDK.md", title: "Platform SDK", group: "SDK" },
  { path: "docs/52-Plugin-Host.md", title: "Plugin Host", group: "SDK" },
  { path: "docs/53-AI-Copilot-Plugin.md", title: "AI Copilot Plugin", group: "AI" },
  { path: "docs/54-Plugin-Marketplace.md", title: "Marketplace", group: "SDK" },
  { path: "docs/55-Service-Mesh.md", title: "Service Mesh", group: "SDK" },
  { path: "docs/56-Extension-Host.md", title: "Extension Host", group: "SDK" },
  { path: "docs/57-Workflow-SDK.md", title: "Workflow SDK", group: "SDK" },
  { path: "docs/58-Event-Automation-SDK.md", title: "Event Automation SDK", group: "SDK" },
  { path: "docs/59-AI-SDK.md", title: "AI SDK", group: "AI" },
  { path: "docs/60-AI-Orchestrator.md", title: "AI Orchestrator", group: "AI" },
  { path: "docs/62-Platform-Health.md", title: "Platform Health", group: "Operação" },
  { path: "docs/72-Security-Audit.md", title: "Security Audit", group: "Segurança" },
  { path: "docs/73-Security-Center.md", title: "Security Center", group: "Segurança" },
  { path: "docs/77-Platform-Studio.md", title: "Platform Studio", group: "Studio" },
  { path: "docs/80-DX-Audit.md", title: "DX Audit", group: "Developer Center" },
  { path: "docs/81-Developer-Center.md", title: "Developer Center", group: "Developer Center" },
];

export default function DocumentationHub() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return DOCS;
    return DOCS.filter((d) => d.title.toLowerCase().includes(term) || d.path.toLowerCase().includes(term) || d.group.toLowerCase().includes(term));
  }, [q]);
  const groups = useMemo(() => {
    const map = new Map<string, DocEntry[]>();
    for (const d of filtered) {
      const list = map.get(d.group) ?? [];
      list.push(d);
      map.set(d.group, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <DeveloperShell title="Documentation Hub" description="Índice pesquisável da pasta docs/.">
      <Input placeholder="Pesquisar por título, caminho ou área…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([group, items]) => (
          <Card key={group} className="p-4">
            <h2 className="ds-h3 mb-2">{group}</h2>
            <ul className="space-y-1 text-sm">
              {items.map((d) => (
                <li key={d.path} className="flex items-start gap-2">
                  <FileText className="size-3 mt-1 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="ds-caption text-muted-foreground font-mono truncate">{d.path}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </DeveloperShell>
  );
}
