import type { Conversation } from "../types/conversation";
import type { IntentClassification } from "../types/classification";
import { classifyConversation } from "../intent/intent-engine";
import { runPipeline } from "../pipelines/pipeline-runner";
import type { PipelineResult } from "../pipelines/pipeline-types";
import {
  aiWorkspaceService,
  type SimilarItem,
  type TriageResult,
} from "./ai-workspace-service";

/**
 * Snapshot mínimo do WorkspaceContext consumido pelo Orchestrator.
 * Duplicado como interface local para manter o Orchestrator desacoplado
 * do módulo `context` (injeção de dependência por estrutura).
 */
export interface OrchestratorContext {
  workspace?: string;
  module?: string;
  page?: string;
  route?: string;
  entityType?: string;
  entityId?: string | null;
  userRole?: string | null;
  breadcrumbs?: string[];
  filters?: Record<string, unknown>;
}

export interface OrchestratorOptions {
  suggestedSystem?: string | null;
  workspaceContext?: OrchestratorContext;
}

export interface OrchestratorDecision {
  classification: IntentClassification;
  pipeline: PipelineResult;
}

export interface OrchestratorTurn {
  decision: OrchestratorDecision;
  /** Próxima pergunta a exibir. Null quando o fluxo deve encerrar. */
  nextQuestion: string | null;
  /** Se true, o Workspace deve iniciar finalize(). */
  shouldFinalize: boolean;
}

export interface OrchestratorFinalizeInput {
  conversation: Conversation;
  sistemas: Array<{ slug: string; nome: string; grupo?: string | null }>;
  workspaceContext?: OrchestratorContext;
}

export interface OrchestratorFinalizeResult {
  titulo: string;
  descricao: string;
  triagem: TriageResult;
  similares: SimilarItem[];
  decision: OrchestratorDecision;
}

function deriveTitulo(descricao: string): string {
  const s = descricao.trim().replace(/\s+/g, " ");
  if (!s) return "Nova solicitação";
  const firstSentence = s.split(/(?<=[.!?])\s/)[0] ?? s;
  const base = firstSentence.length > 90 ? firstSentence.slice(0, 87).trim() + "…" : firstSentence;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/**
 * Rede de segurança: mesmo com o prompt estrito, o título nunca passa de
 * 7 palavras e nunca termina em pontuação.
 */
function enxugarTitulo(titulo: string): string {
  const limpo = titulo.trim().replace(/^["'`]|["'`]$/g, "").replace(/\s+/g, " ");
  if (!limpo) return "Nova solicitação";
  const palavras = limpo.split(" ");
  const cortado = palavras.length > 7 ? palavras.slice(0, 7).join(" ") : limpo;
  const semPonto = cortado.replace(/[.,;:]+$/, "");
  return semPonto.charAt(0).toUpperCase() + semPonto.slice(1);
}


/**
 * Fachada única consumida pelo AI Workspace.
 * O Workspace só conversa com o Orchestrator — NUNCA diretamente com
 * Edge Functions, Supabase ou serviços específicos.
 */
export const aiOrchestrator = {
  decide(
    conversation: Conversation,
    opts?: OrchestratorOptions,
  ): OrchestratorDecision {
    const classification = classifyConversation(conversation, {
      suggestedSystem: opts?.suggestedSystem ?? null,
    });
    const pipeline = runPipeline({ conversation, classification });
    // workspaceContext fica disponível para futuros pipelines sem quebrar contrato.
    void opts?.workspaceContext;
    return { classification, pipeline };
  },

  /**
   * Executa um turno de conversa: classifica intenção e pede a próxima
   * pergunta ao serviço subjacente (quando aplicável).
   */
  async runTurn(
    conversation: Conversation,
    opts?: { maxUserTurns?: number; workspaceContext?: OrchestratorContext },
  ): Promise<OrchestratorTurn> {
    const decision = this.decide(conversation, {
      workspaceContext: opts?.workspaceContext,
    });
    const userTurns = conversation.filter((m) => m.role === "user").length;
    const maxTurns = opts?.maxUserTurns ?? 2;

    if (userTurns >= maxTurns) {
      return { decision, nextQuestion: null, shouldFinalize: true };
    }

    const res = await aiWorkspaceService.askNext(conversation);
    return {
      decision,
      nextQuestion: res.done ? null : res.question,
      shouldFinalize: res.done || !res.question,
    };
  },

  /**
   * Finaliza a conversa gerando descrição, triagem e similares.
   */
  async finalize(input: OrchestratorFinalizeInput): Promise<OrchestratorFinalizeResult> {
    const descricao = await aiWorkspaceService.generateDescription(input.conversation);
    const titulo = enxugarTitulo(
      (await aiWorkspaceService.generateTitle(input.conversation)) || deriveTitulo(descricao),
    );

    const [triagem, similares] = await Promise.all([
      aiWorkspaceService.triage(titulo, descricao, input.sistemas),
      aiWorkspaceService.similar(titulo, descricao),
    ]);
    const decision = this.decide(input.conversation, {
      suggestedSystem: triagem.sistema_alvo_slug,
      workspaceContext: input.workspaceContext,
    });
    return { titulo, descricao, triagem, similares, decision };
  },

  /**
   * Best-effort de match no ecossistema — retorna candidatos ou [].
   */
  matchEcossistema(payload: {
    titulo: string;
    descricao: string;
    tipo_demanda: string | null;
    sistema_alvo_slug: string | null;
  }) {
    return aiWorkspaceService.matchEcossistema(payload);
  },
};

export type AIOrchestrator = typeof aiOrchestrator;
