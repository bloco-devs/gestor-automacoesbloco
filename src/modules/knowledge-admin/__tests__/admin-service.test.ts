import { describe, it, expect } from "vitest";
import { knowledgeAdminService } from "../services/admin-service";
import type { ArticleRow } from "../types";

function mk(partial: Partial<ArticleRow>): ArticleRow {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tipo: "artigo",
    titulo: "t",
    resumo: null,
    conteudo: null,
    categoria: null,
    sistema_slug: null,
    tags: [],
    palavras_chave: [],
    url_externa: null,
    status: partial.status ?? "publicado",
    autor_id: partial.autor_id ?? "u1",
    autor_email: null,
    views: partial.views ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    search_tsv: null as unknown as ArticleRow["search_tsv"],
    // @ts-expect-error runtime col
    deleted_at: partial.deleted_at ?? null,
    ...partial,
  } as ArticleRow;
}

describe("computeMetrics", () => {
  it("agrega contadores por status e ignora soft-deleted no total", () => {
    const rows: ArticleRow[] = [
      mk({ status: "publicado", views: 10, autor_id: "a" }),
      mk({ status: "publicado", views: 5, autor_id: "b" }),
      mk({ status: "rascunho", autor_id: "a" }),
      mk({ status: "em_revisao", autor_id: "c" }),
      mk({ status: "arquivado" }),
      // @ts-expect-error runtime col
      mk({ status: "publicado", deleted_at: new Date().toISOString() }),
    ];
    const m = knowledgeAdminService.computeMetrics(rows);
    expect(m.total).toBe(5);
    expect(m.publicados).toBe(2);
    expect(m.rascunhos).toBe(1);
    expect(m.emRevisao).toBe(1);
    expect(m.arquivados).toBe(1);
    expect(m.excluidos).toBe(1);
    expect(m.views).toBe(15);
    expect(m.autores).toBe(3);
  });

  it("retorna zerado para lista vazia", () => {
    const m = knowledgeAdminService.computeMetrics([]);
    expect(m.total).toBe(0);
    expect(m.publicados).toBe(0);
    expect(m.ultimaAtualizacao).toBeNull();
  });
});
