import { supabase } from "@/integrations/supabase/client";
import type {
  AdminMetrics,
  ArticleInsert,
  ArticleRow,
  ArticleStatus,
  ArticleUpdate,
  ArticleVersion,
} from "../types";

/**
 * Serviço admin da Base de Conhecimento. Reutiliza a tabela
 * `knowledge_articles` (com soft-delete via `deleted_at`) e a nova
 * `knowledge_article_versions`. RLS já garante acesso somente-admin.
 */
export const knowledgeAdminService = {
  async list(includeDeleted = false): Promise<ArticleRow[]> {
    let q = supabase
      .from("knowledge_articles")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!includeDeleted) q = q.is("deleted_at", null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ArticleRow[];
  },

  async get(id: string): Promise<ArticleRow | null> {
    const { data, error } = await supabase
      .from("knowledge_articles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as ArticleRow) ?? null;
  },

  async create(payload: ArticleInsert): Promise<ArticleRow> {
    const { data: userRes } = await supabase.auth.getUser();
    const insert: ArticleInsert = {
      ...payload,
      autor_id: payload.autor_id ?? userRes?.user?.id ?? null,
      autor_email: payload.autor_email ?? userRes?.user?.email ?? null,
    };
    const { data, error } = await supabase
      .from("knowledge_articles")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw error;
    return data as ArticleRow;
  },

  async update(id: string, patch: ArticleUpdate): Promise<ArticleRow> {
    const { data, error } = await supabase
      .from("knowledge_articles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as ArticleRow;
  },

  async setStatus(id: string, status: ArticleStatus): Promise<ArticleRow> {
    return this.update(id, { status });
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from("knowledge_articles")
      .update({ deleted_at: new Date().toISOString(), status: "arquivado" })
      .eq("id", id);
    if (error) throw error;
  },

  async restore(id: string): Promise<void> {
    const { error } = await supabase
      .from("knowledge_articles")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) throw error;
  },

  async duplicate(id: string): Promise<ArticleRow> {
    const src = await this.get(id);
    if (!src) throw new Error("Artigo não encontrado");
    const copy: ArticleInsert = {
      tipo: src.tipo,
      titulo: `${src.titulo} (cópia)`,
      resumo: src.resumo,
      conteudo: src.conteudo,
      categoria: src.categoria,
      sistema_slug: src.sistema_slug,
      tags: src.tags,
      palavras_chave: src.palavras_chave,
      url_externa: src.url_externa,
      status: "rascunho",
    };
    return this.create(copy);
  },

  async listVersions(articleId: string): Promise<ArticleVersion[]> {
    const { data, error } = await supabase
      .from("knowledge_article_versions" as never)
      .select("*")
      .eq("article_id", articleId)
      .order("versao", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as ArticleVersion[];
  },

  async restoreVersion(articleId: string, versionId: string): Promise<ArticleRow> {
    const { data, error } = await supabase
      .from("knowledge_article_versions" as never)
      .select("snapshot")
      .eq("id", versionId)
      .maybeSingle();
    if (error || !data) throw error ?? new Error("Versão não encontrada");
    const snap = (data as { snapshot: Record<string, unknown> }).snapshot;
    const patch: ArticleUpdate = {
      titulo: String(snap.titulo ?? ""),
      tipo: String(snap.tipo ?? "artigo"),
      resumo: (snap.resumo as string | null) ?? null,
      conteudo: (snap.conteudo as string | null) ?? null,
      categoria: (snap.categoria as string | null) ?? null,
      sistema_slug: (snap.sistema_slug as string | null) ?? null,
      tags: (snap.tags as string[]) ?? [],
      palavras_chave: (snap.palavras_chave as string[]) ?? [],
      url_externa: (snap.url_externa as string | null) ?? null,
      status: (snap.status as string) ?? "rascunho",
    };
    return this.update(articleId, patch);
  },

  computeMetrics(rows: ArticleRow[]): AdminMetrics {
    const live = rows.filter((r) => !r.deleted_at);
    const publicados = live.filter((r) => r.status === "publicado").length;
    const rascunhos = live.filter((r) => r.status === "rascunho").length;
    const emRevisao = live.filter((r) => r.status === "em_revisao").length;
    const arquivados = live.filter((r) => r.status === "arquivado").length;
    const excluidos = rows.filter((r) => r.deleted_at).length;
    const views = live.reduce((s, r) => s + (r.views ?? 0), 0);
    const ultimaAtualizacao = live[0]?.updated_at ?? null;
    const autores = new Set(live.map((r) => r.autor_id).filter(Boolean)).size;
    return {
      total: live.length,
      publicados,
      rascunhos,
      emRevisao,
      arquivados,
      excluidos,
      views,
      taxaResolucao: 0,
      ultimaAtualizacao,
      autores,
    };
  },
};

export type KnowledgeAdminService = typeof knowledgeAdminService;
