import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "../utils/markdown";

export function MarkdownEditor({
  value,
  onChange,
  minRows = 14,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
}) {
  const [tab, setTab] = useState("editor");
  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList>
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="mt-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={minRows}
          placeholder="# Título&#10;&#10;Escreva em Markdown. Suporta tabelas, listas, checklist ([ ]), código ```, > alertas, links."
          className="font-mono text-sm"
        />
      </TabsContent>
      <TabsContent value="preview" className="mt-2">
        <div className="rounded-md border bg-card p-4 min-h-[300px]">
          <MarkdownView content={value} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
