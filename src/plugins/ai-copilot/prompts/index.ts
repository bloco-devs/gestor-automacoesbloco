/**
 * Prompt Router — seleciona template conforme o contexto.
 * Puro. Sem side effects. Sem dependência de React.
 */
import type { ModuleKey, WorkspaceContext } from "@/modules/context";
import type { CopilotPromptTemplate } from "../types";
import { demandsPrompt } from "./demands";
import { knowledgePrompt } from "./knowledge";
import { workflowPrompt } from "./workflow";
import { analyticsPrompt } from "./analytics";
import { operationsPrompt } from "./operations";
import { ecossistemaPrompt } from "./ecossistema";
import { portalPrompt } from "./portal";
import { adminPrompt } from "./admin";
import { developerPrompt } from "./developer";

export const ALL_PROMPTS: CopilotPromptTemplate[] = [
  demandsPrompt,
  knowledgePrompt,
  workflowPrompt,
  analyticsPrompt,
  operationsPrompt,
  ecossistemaPrompt,
  portalPrompt,
  adminPrompt,
  developerPrompt,
];

const DEFAULT_PROMPT: CopilotPromptTemplate = {
  id: "prompt.default",
  module: "default",
  system:
    "Você é o AI Copilot da plataforma. Ajude o usuário com base no contexto informado. " +
    "Seja breve, claro e evite jargão.",
  hint: "Como posso ajudar aqui?",
};

/**
 * Escolhe o prompt mais adequado usando module, entityType e rota.
 */
export function routePrompt(ctx: WorkspaceContext): CopilotPromptTemplate {
  const byRoute = matchRoute(ctx.route);
  if (byRoute) return byRoute;

  const byModule = matchModule(ctx.module);
  if (byModule) return byModule;

  return DEFAULT_PROMPT;
}

function matchRoute(route: string): CopilotPromptTemplate | null {
  if (!route) return null;
  if (route.startsWith("/portal") || route.startsWith("/nova-solicitacao")) return portalPrompt;
  if (route.startsWith("/admin/base-conhecimento")) return knowledgePrompt;
  if (route.startsWith("/admin/workflow") || route.startsWith("/admin/workflows")) return workflowPrompt;
  if (route.startsWith("/admin/analytics")) return analyticsPrompt;
  if (route.startsWith("/operacoes") || route.startsWith("/command-center")) return operationsPrompt;
  if (route.startsWith("/ecossistema") || route.startsWith("/diagrama")) return ecossistemaPrompt;
  if (route.startsWith("/workspace") || route.startsWith("/admin/demandas")) return developerPrompt;
  if (route.startsWith("/admin")) return adminPrompt;
  if (route.startsWith("/solicitacoes") || route.startsWith("/kanban")) return demandsPrompt;
  return null;
}

function matchModule(mod: ModuleKey): CopilotPromptTemplate | null {
  if (mod === "unknown") return null;
  return ALL_PROMPTS.find((p) => p.module === mod) ?? null;
}

export { DEFAULT_PROMPT };
