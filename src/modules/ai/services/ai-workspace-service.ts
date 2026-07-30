import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "../types/conversation";

/**
 * Camada interna de I/O. Isolada aqui para que o AI Workspace
 * não conheça edge functions/Supabase — ele só fala com o Orchestrator.
 * Trocar a implementação (HTTP, worker, mock) não afeta o Workspace.
 */

export interface AssistantNextQuestion {
  done: boolean;
  question: string | null;
}

export interface TriageResult {
  frequencia: number;
  dificuldade: number;
  retorno: number;
  complexidade_dev: number;
  tipo_demanda: string | null;
  sistema_alvo_slug: string | null;
  justificativa: string | null;
}

export interface SimilarItem {
  id: string;
  titulo: string;
  similaridade: number;
  motivo: string;
}

async function invoke<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export const aiWorkspaceService = {
  askNext(conversation: Conversation) {
    return invoke<AssistantNextQuestion>("assistente-demanda", {
      action: "next_question",
      messages: conversation,
    });
  },
  generateDescription(conversation: Conversation) {
    return invoke<{ description?: string }>("assistente-demanda", {
      action: "generate_description",
      messages: conversation,
    }).then((r) => String(r.description ?? "").trim());
  },
  /** Título curto (5–7 palavras). Best-effort: falhou, devolve "". */
  async generateTitle(conversation: Conversation): Promise<string> {
    try {
      const r = await invoke<{ title?: string }>("assistente-demanda", {
        action: "generate_title",
        messages: conversation,
      });
      return String(r.title ?? "").trim();
    } catch {
      return "";
    }
  },

  triage(
    titulo: string,
    descricao: string,
    sistemas: Array<{ slug: string; nome: string; grupo?: string | null }>,
  ) {

    return invoke<TriageResult>("triagem-demanda", { titulo, descricao, setor: "", sistemas });
  },
  async similar(titulo: string, descricao: string): Promise<SimilarItem[]> {
    try {
      const data = await invoke<{ similares?: SimilarItem[] }>("demandas-similares", { titulo, descricao });
      return Array.isArray(data.similares) ? data.similares : [];
    } catch {
      return [];
    }
  },
  async matchEcossistema(payload: {
    titulo: string;
    descricao: string;
    tipo_demanda: string | null;
    sistema_alvo_slug: string | null;
  }): Promise<unknown[]> {
    try {
      const data = await invoke<{ candidatos?: unknown[] }>("match-ecossistema", payload);
      return Array.isArray(data.candidatos) ? data.candidatos : [];
    } catch {
      return [];
    }
  },
};

export type AIWorkspaceService = typeof aiWorkspaceService;
