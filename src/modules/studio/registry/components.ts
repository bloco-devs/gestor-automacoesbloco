/**
 * Component Registry — catálogo visual do Studio (Onda 2).
 * Metadados apenas: cada item aponta para um render leve dentro do canvas.
 * Não substitui os componentes reais; serve como blueprint de baixo código.
 */

export type StudioPropKind = "text" | "number" | "boolean" | "color" | "select" | "icon" | "json";

export interface StudioPropSpec {
  key: string;
  label: string;
  kind: StudioPropKind;
  options?: string[];
  defaultValue?: unknown;
  help?: string;
  bindable?: boolean;
}

export interface StudioComponentSpec {
  id: string;
  label: string;
  group: "Layout" | "Basicos" | "Dados" | "Feedback" | "Formularios" | "Dashboards";
  icon: string;
  description: string;
  acceptsChildren?: boolean;
  props: StudioPropSpec[];
}

export const STUDIO_COMPONENTS: StudioComponentSpec[] = [
  {
    id: "section",
    label: "Section",
    group: "Layout",
    icon: "LayoutTemplate",
    description: "Bloco vertical com título e ações.",
    acceptsChildren: true,
    props: [
      { key: "title", label: "Título", kind: "text", defaultValue: "Nova seção" },
      { key: "description", label: "Descrição", kind: "text", defaultValue: "" },
    ],
  },
  {
    id: "toolbar",
    label: "Toolbar",
    group: "Layout",
    icon: "SlidersHorizontal",
    description: "Linha superior com ações.",
    acceptsChildren: true,
    props: [],
  },
  {
    id: "grid",
    label: "Grid",
    group: "Layout",
    icon: "LayoutGrid",
    description: "Grade responsiva 12 colunas.",
    acceptsChildren: true,
    props: [
      { key: "columns", label: "Colunas", kind: "number", defaultValue: 3 },
      { key: "gap", label: "Espaçamento", kind: "number", defaultValue: 4 },
    ],
  },
  {
    id: "button",
    label: "Botão",
    group: "Basicos",
    icon: "Square",
    description: "Botão primário reaproveitando o UI kit.",
    props: [
      { key: "label", label: "Texto", kind: "text", defaultValue: "Ação", bindable: true },
      {
        key: "variant",
        label: "Variante",
        kind: "select",
        options: ["default", "secondary", "outline", "ghost"],
        defaultValue: "default",
      },
    ],
  },
  {
    id: "input",
    label: "Input",
    group: "Formularios",
    icon: "Type",
    description: "Campo de texto controlado.",
    props: [
      { key: "placeholder", label: "Placeholder", kind: "text", defaultValue: "Digite…" },
      { key: "label", label: "Rótulo", kind: "text", defaultValue: "Campo" },
    ],
  },
  {
    id: "card",
    label: "Card",
    group: "Layout",
    icon: "Square",
    description: "Card com título e conteúdo.",
    acceptsChildren: true,
    props: [{ key: "title", label: "Título", kind: "text", defaultValue: "Card" }],
  },
  {
    id: "stat",
    label: "StatCard",
    group: "Dashboards",
    icon: "Activity",
    description: "Cartão métrico (DS 2.0).",
    props: [
      { key: "label", label: "Rótulo", kind: "text", defaultValue: "Indicador" },
      { key: "value", label: "Valor", kind: "text", defaultValue: "0", bindable: true },
      {
        key: "tone",
        label: "Tom",
        kind: "select",
        options: ["default", "positive", "negative", "warning", "info"],
        defaultValue: "default",
      },
    ],
  },
  {
    id: "kpiRow",
    label: "KPI Row",
    group: "Dashboards",
    icon: "BarChart3",
    description: "Linha de indicadores rápidos.",
    props: [
      {
        key: "items",
        label: "Itens (JSON)",
        kind: "json",
        defaultValue: [{ label: "Total", value: 0 }],
        bindable: true,
      },
    ],
  },
  {
    id: "table",
    label: "Tabela",
    group: "Dados",
    icon: "Table2",
    description: "Tabela simples com colunas e linhas.",
    props: [
      { key: "columns", label: "Colunas (JSON)", kind: "json", defaultValue: ["Coluna A", "Coluna B"] },
      { key: "rows", label: "Linhas (JSON)", kind: "json", defaultValue: [], bindable: true },
    ],
  },
  {
    id: "timeline",
    label: "Timeline",
    group: "Feedback",
    icon: "GitBranch",
    description: "Linha do tempo vertical.",
    props: [
      { key: "items", label: "Eventos (JSON)", kind: "json", defaultValue: [], bindable: true },
    ],
  },
  {
    id: "kanban",
    label: "Kanban",
    group: "Dados",
    icon: "Kanban",
    description: "Quadro com colunas de cartões.",
    props: [
      {
        key: "columns",
        label: "Colunas (JSON)",
        kind: "json",
        defaultValue: [{ title: "A fazer" }, { title: "Feito" }],
        bindable: true,
      },
    ],
  },
  {
    id: "form",
    label: "Formulário",
    group: "Formularios",
    icon: "ClipboardList",
    description: "Formulário declarativo.",
    acceptsChildren: true,
    props: [{ key: "title", label: "Título", kind: "text", defaultValue: "Novo formulário" }],
  },
  {
    id: "dialog",
    label: "Diálogo",
    group: "Feedback",
    icon: "MessageSquare",
    description: "Diálogo modal.",
    acceptsChildren: true,
    props: [{ key: "title", label: "Título", kind: "text", defaultValue: "Confirmar" }],
  },
  {
    id: "chart",
    label: "Gráfico",
    group: "Dashboards",
    icon: "LineChart",
    description: "Placeholder de gráfico (line/bar/area).",
    props: [
      {
        key: "kind",
        label: "Tipo",
        kind: "select",
        options: ["line", "bar", "area", "pie"],
        defaultValue: "line",
      },
      { key: "series", label: "Séries (JSON)", kind: "json", defaultValue: [], bindable: true },
    ],
  },
  {
    id: "text",
    label: "Texto",
    group: "Basicos",
    icon: "Text",
    description: "Bloco de texto rico.",
    props: [
      { key: "content", label: "Conteúdo", kind: "text", defaultValue: "Escreva aqui…", bindable: true },
      {
        key: "size",
        label: "Tamanho",
        kind: "select",
        options: ["xs", "sm", "base", "lg", "xl", "2xl"],
        defaultValue: "base",
      },
    ],
  },
];

export function findComponentSpec(type: string): StudioComponentSpec | null {
  return STUDIO_COMPONENTS.find((c) => c.id === type) ?? null;
}
