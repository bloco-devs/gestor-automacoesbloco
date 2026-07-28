import { memo } from "react";
import type { StudioNode } from "../types";
import { nodeFromSpec } from "../store";
import { Button } from "@/components/ui/button";
import { Section } from "@/design-system";
import { Sparkles } from "lucide-react";

interface Props {
  onAppend: (node: StudioNode) => void;
}

/** Templates puramente client-side; consomem os componentes já registrados. */
const TEMPLATES: Array<{ id: string; label: string; desc: string; build: () => StudioNode | null }> = [
  {
    id: "dashboard",
    label: "Dashboard Operacional",
    desc: "KPIs + gráfico + tabela.",
    build: () => {
      const section = nodeFromSpec("section");
      if (!section) return null;
      section.props = { title: "Dashboard", description: "Visão geral" };
      const kpi = nodeFromSpec("kpiRow");
      const chart = nodeFromSpec("chart");
      const table = nodeFromSpec("table");
      section.children = [kpi, chart, table].filter(Boolean) as StudioNode[];
      return section;
    },
  },
  {
    id: "form",
    label: "Formulário Inteligente",
    desc: "Campos + botão de envio.",
    build: () => {
      const form = nodeFromSpec("form");
      if (!form) return null;
      const i1 = nodeFromSpec("input");
      const i2 = nodeFromSpec("input");
      const btn = nodeFromSpec("button");
      form.children = [i1, i2, btn].filter(Boolean) as StudioNode[];
      return form;
    },
  },
  {
    id: "kanban",
    label: "Quadro Kanban",
    desc: "Colunas de trabalho.",
    build: () => nodeFromSpec("kanban"),
  },
  {
    id: "docs",
    label: "Página de Documentação",
    desc: "Título + blocos de texto.",
    build: () => {
      const section = nodeFromSpec("section");
      if (!section) return null;
      section.props = { title: "Documento", description: "Referência técnica" };
      const t1 = nodeFromSpec("text");
      const t2 = nodeFromSpec("text");
      section.children = [t1, t2].filter(Boolean) as StudioNode[];
      return section;
    },
  },
];

function AIStudioInner({ onAppend }: Props) {
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> AI Studio
        </span>
      }
      description="Templates prontos gerados a partir do catálogo do Studio. Nenhuma execução de IA sem confirmação."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {TEMPLATES.map((t) => (
          <div key={t.id} className="border rounded-md p-3 flex flex-col gap-2 bg-card">
            <p className="font-medium">{t.label}</p>
            <p className="ds-caption text-muted-foreground">{t.desc}</p>
            <Button
              size="sm"
              className="self-end"
              onClick={() => {
                const n = t.build();
                if (n) onAppend(n);
              }}
            >
              Adicionar
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

export const AIStudio = memo(AIStudioInner);
