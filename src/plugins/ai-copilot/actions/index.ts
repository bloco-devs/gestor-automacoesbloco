/**
 * Quick Actions do Copilot.
 * Cada ação apenas MONTA CONTEXTO — nenhum efeito colateral no core.
 */
import type { WorkspaceContext } from "@/modules/context";
import type { CopilotAction } from "../types";

function ctxSummary(ctx: WorkspaceContext): string {
  const parts = [
    `rota=${ctx.route}`,
    `módulo=${ctx.module}`,
    ctx.entityType !== "none" ? `entidade=${ctx.entityType}#${ctx.entityId ?? "?"}` : null,
    ctx.selectedItems.length ? `selecionados=${ctx.selectedItems.length}` : null,
  ].filter(Boolean);
  return parts.join("; ");
}

export const COPILOT_ACTIONS: CopilotAction[] = [
  {
    id: "copilot.summarize",
    label: "Resumir",
    description: "Resume o conteúdo/tela atual.",
    modules: [],
    buildPrompt: (c) => `Resuma o que está visível para o usuário. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.explain",
    label: "Explicar",
    description: "Explica em linguagem simples.",
    modules: [],
    buildPrompt: (c) => `Explique em linguagem simples esta tela. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.subtasks",
    label: "Gerar subtasks",
    description: "Sugere subtasks para a demanda atual.",
    modules: ["kanban", "solicitacoes", "solucoes", "atividades"],
    buildPrompt: (c) => `Sugira subtasks para a entidade atual. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.reply-user",
    label: "Responder usuário",
    description: "Rascunha resposta para o solicitante.",
    modules: ["kanban", "solicitacoes"],
    buildPrompt: (c) => `Rascunhe uma resposta cordial ao solicitante da demanda. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.docgen",
    label: "Criar documentação",
    description: "Gera esqueleto de artigo/knowledge.",
    modules: [],
    buildPrompt: (c) => `Gere um esqueleto de artigo de knowledge base a partir do contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.link-article",
    label: "Relacionar artigo",
    description: "Sugere artigos relacionados.",
    modules: [],
    buildPrompt: (c) => `Sugira artigos de knowledge relacionados. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.workflow-explain",
    label: "Explicar Workflow",
    description: "Explica um workflow etapa por etapa.",
    modules: [],
    buildPrompt: (c) => `Explique o workflow atual etapa por etapa. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.sla-analyze",
    label: "Analisar SLA",
    description: "Analisa risco de SLA.",
    modules: [],
    buildPrompt: (c) => `Analise o risco de SLA das demandas visíveis. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.analytics-explain",
    label: "Explicar Analytics",
    description: "Interpreta gráficos.",
    modules: [],
    buildPrompt: (c) => `Interprete os gráficos visíveis e destaque insights. Contexto: ${ctxSummary(c)}.`,
  },
  {
    id: "copilot.ecossistema-explain",
    label: "Explicar Ecossistema",
    description: "Explica dependências e riscos do ecossistema.",
    modules: ["ecossistema"],
    buildPrompt: (c) => `Explique dependências e riscos do ecossistema. Contexto: ${ctxSummary(c)}.`,
  },
];

/**
 * Filtra ações relevantes para o módulo atual.
 */
export function actionsFor(module: WorkspaceContext["module"]): CopilotAction[] {
  return COPILOT_ACTIONS.filter(
    (a) => a.modules.length === 0 || a.modules.includes(module),
  );
}

export { ctxSummary };
