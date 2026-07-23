import { memo, useMemo, useState } from "react";
import type { StudioDocument } from "../types";
import { Section } from "@/design-system";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface Props {
  doc: StudioDocument;
}

function buildPluginManifest(doc: StudioDocument) {
  return {
    id: `plugin.${doc.id}`,
    name: doc.name,
    version: doc.version,
    entry: `studio://${doc.id}`,
    contributes: {
      studio: {
        layoutRef: doc.id,
      },
    },
    metadata: {
      generatedBy: "PlatformStudio",
      generatedAt: new Date().toISOString(),
    },
  };
}

function buildStudioManifest(doc: StudioDocument) {
  return {
    kind: "studio.manifest",
    version: "1.0",
    document: {
      id: doc.id,
      name: doc.name,
      version: doc.version,
    },
    createdAt: doc.meta.createdAt,
    updatedAt: doc.meta.updatedAt,
  };
}

function buildBindings(doc: StudioDocument) {
  return { bindings: doc.bindings };
}

function buildLayout(doc: StudioDocument) {
  return { root: doc.root };
}

function buildDocs(doc: StudioDocument) {
  const bindings = Object.values(doc.bindings);
  return [
    `# ${doc.name}`,
    ``,
    `Rascunho gerado pelo Platform Studio (${doc.version}).`,
    ``,
    `## Bindings (${bindings.length})`,
    ...bindings.map((b) => `- **${b.kind}** \`${b.target}\``),
  ].join("\n");
}

function ExportPanelInner({ doc }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState("manifest");

  const files = useMemo(
    () => ({
      manifest: JSON.stringify(buildPluginManifest(doc), null, 2),
      studio: JSON.stringify(buildStudioManifest(doc), null, 2),
      layout: JSON.stringify(buildLayout(doc), null, 2),
      bindings: JSON.stringify(buildBindings(doc), null, 2),
      docs: buildDocs(doc),
    }),
    [doc],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(files[tab as keyof typeof files]);
      toast({ title: "Copiado", description: "Conteúdo copiado para a área de transferência." });
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
    }
  };

  const download = () => {
    const blob = new Blob([files[tab as keyof typeof files]], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.id}.${tab}.${tab === "docs" ? "md" : "json"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Section
      title="Export"
      description="Artefatos prontos para o Marketplace/Extension Host. Nada é publicado automaticamente."
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={copy}>
            Copiar
          </Button>
          <Button size="sm" onClick={download}>
            Baixar
          </Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5">
          <TabsTrigger value="manifest">Plugin Manifest</TabsTrigger>
          <TabsTrigger value="studio">Studio Manifest</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="bindings">Bindings</TabsTrigger>
          <TabsTrigger value="docs">Docs</TabsTrigger>
        </TabsList>
        {(["manifest", "studio", "layout", "bindings", "docs"] as const).map((k) => (
          <TabsContent key={k} value={k}>
            <Textarea
              readOnly
              value={files[k]}
              className="font-mono text-xs min-h-[280px]"
              aria-label={`Conteúdo ${k}`}
            />
          </TabsContent>
        ))}
      </Tabs>
    </Section>
  );
}

export const ExportPanel = memo(ExportPanelInner);
