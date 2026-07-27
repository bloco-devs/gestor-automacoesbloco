import { describe, it, expect } from "vitest";
import { montarProgressao, type Evento } from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A linha do tempo é lida em menos de um segundo, e ninguém confere. Por isso
 * o custo de ela mentir é maior que o de qualquer outro componente da tela:
 * uma etapa pulada pintada de cumprida some com a informação de que ninguém
 * testou, e essa informação some justamente quando mais importa — na hora de
 * decidir se pode ir para produção.
 */

const ETAPAS = [
  { id: "backlog", rotulo: "Backlog" },
  { id: "a_fazer", rotulo: "A Fazer" },
  { id: "dev", rotulo: "Em Desenvolvimento" },
  { id: "testes", rotulo: "Em Testes" },
  { id: "concluido", rotulo: "Concluído" },
];

function mudanca(id: string, em: string, para: string): Evento {
  return {
    id,
    tipo: "mudanca",
    autor: { id: "dev", nome: "Dev", avatarUrl: null, ia: false },
    em,
    texto: `moveu para ${para}`,
    interna: false,
  };
}

function demanda(statusId: string, rotulo: string, patch: Record<string, unknown> = {}) {
  return {
    id: "d1", referencia: "#d1", titulo: "T", descricao: "",
    status: { id: statusId, rotulo, categoria: "andamento" as const, ordem: 1 },
    prioridade: "media" as const, tipo: null, complexidade: null, sistema: null,
    responsaveis: [], autor: null, criadaEm: "2026-03-01", atualizadaEm: "2026-03-01",
    diasParada: 0, prazo: null, sla: null, ia: null, progresso: null, comentarios: null,
    anexos: null, etiquetas: [], concluida: false, risco: null, fonte: "demands" as const,
    ...patch,
  } as never;
}

const AGORA = new Date("2026-03-20T12:00:00Z").getTime();

describe("linha do tempo da demanda", () => {
  it("etapa atravessada sem passagem aparece como pulada, não cumprida", () => {
    // A demanda foi de "A Fazer" direto para "Concluído": ninguém testou.
    // Pintar "Em Testes" de verde apagaria exatamente esse fato.
    const eventos = [
      mudanca("1", "2026-03-02T10:00:00Z", "A Fazer"),
      mudanca("2", "2026-03-10T10:00:00Z", "Concluído"),
    ];
    const p = montarProgressao(demanda("concluido", "Concluído"), eventos, ETAPAS, AGORA);
    const porId = new Map(p.etapas.map((e) => [e.id, e]));
    expect(porId.get("a_fazer")?.estado).toBe("concluida");
    expect(porId.get("dev")?.estado).toBe("pulada");
    expect(porId.get("testes")?.estado).toBe("pulada");
    expect(porId.get("concluido")?.estado).toBe("atual");
  });

  it("conta quantas vezes voltou para uma etapa anterior", () => {
    // Três voltas de testes para desenvolvimento costumam significar requisito
    // mal entendido — e some se a tela só mostrar o estado atual.
    const eventos = [
      mudanca("1", "2026-03-02T10:00:00Z", "Em Desenvolvimento"),
      mudanca("2", "2026-03-05T10:00:00Z", "Em Testes"),
      mudanca("3", "2026-03-06T10:00:00Z", "Em Desenvolvimento"),
      mudanca("4", "2026-03-08T10:00:00Z", "Em Testes"),
      mudanca("5", "2026-03-09T10:00:00Z", "Em Desenvolvimento"),
    ];
    const p = montarProgressao(demanda("dev", "Em Desenvolvimento"), eventos, ETAPAS, AGORA);
    expect(p.retrabalho).toBe(2);
  });

  it("caminho sem voltas não acusa retrabalho", () => {
    const eventos = [
      mudanca("1", "2026-03-02T10:00:00Z", "A Fazer"),
      mudanca("2", "2026-03-04T10:00:00Z", "Em Desenvolvimento"),
    ];
    expect(montarProgressao(demanda("dev", "Em Desenvolvimento"), eventos, ETAPAS, AGORA).retrabalho).toBe(0);
  });

  it("dias na etapa atual contam desde a ÚLTIMA entrada, não a primeira", () => {
    // Uma demanda que voltou para desenvolvimento ontem não está lá há 18 dias.
    const eventos = [
      mudanca("1", "2026-03-02T12:00:00Z", "Em Desenvolvimento"),
      mudanca("2", "2026-03-10T12:00:00Z", "Em Testes"),
      mudanca("3", "2026-03-19T12:00:00Z", "Em Desenvolvimento"),
    ];
    const p = montarProgressao(demanda("dev", "Em Desenvolvimento"), eventos, ETAPAS, AGORA);
    expect(p.diasNaAtual).toBe(1);
  });

  it("etapas depois da atual são futuras, não puladas", () => {
    const eventos = [mudanca("1", "2026-03-02T10:00:00Z", "Em Desenvolvimento")];
    const p = montarProgressao(demanda("dev", "Em Desenvolvimento"), eventos, ETAPAS, AGORA);
    const porId = new Map(p.etapas.map((e) => [e.id, e]));
    expect(porId.get("testes")?.estado).toBe("futura");
    expect(porId.get("concluido")?.estado).toBe("futura");
  });

  it("sem nenhuma auditoria a linha ainda funciona — não some nem quebra", () => {
    // Demanda recém-criada, ou fonte sem auditoria. A tela precisa desenhar
    // alguma coisa honesta em vez de sumir.
    const p = montarProgressao(demanda("backlog", "Backlog"), [], ETAPAS, AGORA);
    expect(p.etapas).toHaveLength(5);
    expect(p.etapas[0].estado).toBe("atual");
    expect(p.retrabalho).toBe(0);
  });
});
