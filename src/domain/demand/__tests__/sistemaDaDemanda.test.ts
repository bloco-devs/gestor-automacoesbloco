import { describe, expect, it } from "vitest";
import type { Demand } from "@/modules/demands/types";
import { fromDemands } from "../mappers/fromDemands";
import { sistemaDaDemanda } from "../services/siglaDoSistema";

/**
 * O DEFEITO QUE ESTES TESTES TRANCAM
 *
 * A GP-2609-0001 tem `sistema_slug = 'processos'` — é por isso que o código é
 * GP-. Mas a tag no topo do detalhe dizia "Sistema: Gestão de Obra". A tela
 * não recebia o slug (o mapper descartava), caía no palpite pelo texto, e a
 * descrição falava em "planejamento", primeira palavra-chave da lista, da Obra.
 *
 * O código e a tag nunca podem se contradizer: os dois têm que sair do slug.
 */

const GP_2609_0001 = {
  titulo: "Melhorias na aba Em Atividades do sistema",
  descricao:
    "O solicitante deseja otimizar a gestão de tarefas no sistema de processos, especificamente na aba " +
    '"Em Atividades". Atualmente, o planejamento é ineficiente porque os rituais por demanda só podem ser ' +
    "iniciados no próprio dia. O time perde algumas horas por semana apenas realizando o planejamento mensal.",
};

describe("sistemaDaDemanda — o dado antes do palpite", () => {
  it("regressão GP-2609-0001: slug 'processos' vence a descrição que fala em planejamento", () => {
    const s = sistemaDaDemanda({ sistemaSlug: "processos", sistema: null, titulo: GP_2609_0001.titulo }, GP_2609_0001.descricao);
    expect(s).toEqual({ sigla: "SGPO", nome: "Gestão de Processo / SGPO", palpite: false });
  });

  it("sem o slug, o mesmo texto seria adivinhado — e errado. Por isso o slug manda", () => {
    const palpite = sistemaDaDemanda({ sistemaSlug: null, sistema: null, titulo: GP_2609_0001.titulo }, GP_2609_0001.descricao);
    expect(palpite.palpite).toBe(true);
    expect(palpite.sigla).not.toBe("SGPO");
  });

  it("o slug vence qualquer texto, em qualquer direção", () => {
    const s = sistemaDaDemanda(
      { sistemaSlug: "produtividade", titulo: "Ajuste no fluxo do SGPO" },
      "gestão de processos, sgpo, processo sgpo",
    );
    expect(s.sigla).toBe("OBRA");
    expect(s.palpite).toBe(false);
  });

  it("slug fora do catálogo aparece cru, sem sigla inventada", () => {
    expect(sistemaDaDemanda({ sistemaSlug: "sistema-novo" })).toEqual({ sigla: null, nome: "sistema-novo", palpite: false });
  });

  it("sem slug, o sistema do catálogo antigo (system_id) é dado, não palpite", () => {
    expect(sistemaDaDemanda({ sistema: { nome: "Sienge" }, titulo: "planejamento de obra" })).toEqual({
      sigla: "SIENGE",
      nome: "Sienge",
      palpite: false,
    });
  });

  it("nome antigo não reconhecido NÃO vira sigla de 4 letras de outro sistema", () => {
    // Com o último recurso de siglaDoSistema, "Portal XYZ" viraria PORT —
    // a sigla do Gestor de Portfólio.
    expect(sistemaDaDemanda({ sistema: { nome: "Portal XYZ" } })).toEqual({ sigla: null, nome: "Portal XYZ", palpite: false });
  });

  it("nome antigo não se mistura com o título: 'Sienge' com título de obra continua Sienge", () => {
    expect(sistemaDaDemanda({ sistema: { nome: "Sienge" }, titulo: "Canteiro de obras, entregas" }).sigla).toBe("SIENGE");
  });

  it("sem nada registrado e sem pista no texto, não há sistema", () => {
    expect(sistemaDaDemanda({ titulo: "Dúvida geral" })).toEqual({ sigla: null, nome: null, palpite: false });
  });
});

describe("fromDemands entrega o slug para a tela", () => {
  const linha = (over: Partial<Demand> = {}): Demand =>
    ({
      id: "33333333-3333-3333-3333-333333333333",
      ticket_code: "GP-2609-0001",
      title: GP_2609_0001.titulo,
      description: GP_2609_0001.descricao,
      system_id: null,
      status: "a_fazer",
      priority: "media",
      type: "melhoria",
      complexity: "media",
      assigned_to: null,
      created_by: "u1",
      created_at: "2026-09-25T10:00:00Z",
      updated_at: "2026-09-25T10:00:00Z",
      deleted_at: null,
      sla_due_at: null,
      sla_first_response_at: null,
      sla_status: "no_prazo",
      ...over,
    }) as Demand;

  it("sistema_slug do banco chega como sistemaSlug no domínio", () => {
    const d = fromDemands({ demands: [linha({ sistema_slug: "processos" })] }).demandas[0];
    expect(d.sistemaSlug).toBe("processos");
    expect(sistemaDaDemanda(d, GP_2609_0001.descricao).nome).toBe("Gestão de Processo / SGPO");
  });

  it("sem slug no banco, o domínio recebe null — não undefined", () => {
    expect(fromDemands({ demands: [linha()] }).demandas[0].sistemaSlug).toBeNull();
  });

  it("o código do chamado continua o do banco", () => {
    expect(fromDemands({ demands: [linha({ sistema_slug: "processos" })] }).demandas[0].referencia).toBe("GP-2609-0001");
  });
});
