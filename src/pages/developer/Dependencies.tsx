import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeveloperShell } from "@/modules/developer-center/DeveloperShell";
import { buildMermaidGraph, listModules } from "@/modules/observability";
import { Copy, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function DependencyExplorer() {
  const modules = useMemo(() => listModules(), []);
  const [filter, setFilter] = useState<string>("__all__");
  const mermaid = useMemo(() => buildMermaidGraph(filter === "__all__" ? {} : { module: filter }), [filter]);

  async function copy() {
    await navigator.clipboard.writeText(mermaid);
    toast({ title: "Mermaid copiado" });
  }
  function download() {
    const blob = new Blob([mermaid], { type: "text/vnd.mermaid" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dependency-graph.mmd";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DeveloperShell
      title="Dependency Explorer"
      description="Grafo vivo entre módulos, plugins e SDKs. Exporta Mermaid."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={copy}><Copy className="h-3 w-3 mr-1" /> Copiar</Button>
          <Button variant="outline" size="sm" onClick={download}><Download className="h-3 w-3 mr-1" /> Baixar .mmd</Button>
        </>
      }
    >
      <div className="flex items-center gap-2">
        <label className="ds-caption text-muted-foreground">Filtrar módulo</label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Card className="p-4">
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{mermaid}</pre>
      </Card>
    </DeveloperShell>
  );
}
