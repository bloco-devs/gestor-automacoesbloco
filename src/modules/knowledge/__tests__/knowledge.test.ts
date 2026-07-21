import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: vi.fn().mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) }),
    },
  };
});

import { supabase } from "@/integrations/supabase/client";
import { knowledgeService } from "../services/knowledge-service";

beforeEach(() => vi.clearAllMocks());

describe("knowledgeService.search", () => {
  it("combina artigos e demandas semelhantes ordenando por relevância", async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          id: "a1",
          tipo: "faq",
          titulo: "Como redefinir senha",
          resumo: "Guia",
          categoria: "Acesso",
          sistema_slug: null,
          url_externa: null,
          updated_at: new Date().toISOString(),
          relevancia: 0.7,
        },
      ],
      error: null,
    });
    (supabase.functions.invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        similares: [
          { id: "s1", titulo: "Bug de login", similaridade: 92, motivo: "mesmo sintoma" },
        ],
      },
      error: null,
    });

    const res = await knowledgeService.search(
      "não consigo entrar no sistema mesmo com senha nova",
    );
    expect(res.length).toBeGreaterThanOrEqual(2);
    expect(res[0].relevancia).toBeGreaterThanOrEqual(res[1].relevancia);
    expect(res.find((r) => r.source === "similar_demand")?.href).toBe("/solicitacao/s1");
  });

  it("retorna vazio para texto curto (não chama similares)", async () => {
    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null });
    const res = await knowledgeService.search("oi");
    expect(res).toEqual([]);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});

describe("knowledgeService.recordFeedback", () => {
  it("insere na tabela knowledge_feedback usando o usuário logado", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ insert });
    await knowledgeService.recordFeedback({
      articleId: "a1",
      demandaSimilarId: null,
      queryText: "não consigo acessar",
      resolved: true,
      origem: "portal",
    });
    expect(supabase.from).toHaveBeenCalledWith("knowledge_feedback");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        article_id: "a1",
        resolved: true,
        origem: "portal",
        user_id: "u1",
      }),
    );
  });
});
