import { describe, it, expect } from "vitest";
import { chegouAgora, pesoDeAtencao, ordenarPorAtencao, type Demanda } from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A ordenação por atenção decide o que a pessoa vê primeiro — e o que ela
 * não vê, na prática, não existe. Antes, uma demanda recém-chegada afundava
 * no meio da lista porque a regra só premiava tempo parado. O risco de
 * regredir isso é alto justamente porque ninguém percebe: a lista continua
 * carregando, só que o pedido novo some.
 */

const AGORA = new Date("2026-07-28T15:00:00Z").getTime();

function demanda(patch: Partial<Demanda> = {}): Demanda {
  return {
    id: "d1",
    referencia: "#d1",
    titulo: "Demanda",
    descricao: "",
    status: { id: "backlog", rotulo: "Backlog", categoria: "aberta", ordem: 0 },
    prioridade: null,
    tipo: null,
    complexidade: null,
    sistema: null,
    responsaveis: [],
    autor: null,
    criadaEm: "2026-07-28T09:00:00Z",
    atualizadaEm: "2026-07-28T09:00:00Z",
    diasParada: 0,
    prazo: null,
    sla: null,
    ia: null,
    progresso: null,
    comentarios: null,
    anexos: null,
    etiquetas: [],
    concluida: false,
    risco: null,
    fonte: "demands",
    ...patch,
  };
}

describe("chegouAgora", () => {
  it("reconhece a demanda aberta hoje e sem responsável", () => {
    expect(chegouAgora(demanda(), AGORA)).toBe(true);
  });

  it("deixa de valer assim que alguém assume", () => {
    const comDono = demanda({
      responsaveis: [{ id: "u1", nome: "Alguém", avatarUrl: null }],
    });
    expect(chegouAgora(comDono, AGORA)).toBe(false);
  });

  it("não vale para demanda de ontem", () => {
    expect(chegouAgora(demanda({ criadaEm: "2026-07-27T23:00:00Z" }), AGORA)).toBe(false);
  });

  it("não vale para concluída, mesmo aberta hoje", () => {
    expect(chegouAgora(demanda({ concluida: true }), AGORA)).toBe(false);
  });
});

describe("pesoDeAtencao com chegada recente", () => {
  it("põe a recém-chegada acima de uma parada há 15 dias", () => {
    const nova = demanda({ id: "nova" });
    const parada = demanda({
      id: "parada",
      criadaEm: "2026-07-13T09:00:00Z",
      diasParada: 15,
      risco: "parada",
    });
    expect(pesoDeAtencao(nova, AGORA)).toBeGreaterThan(pesoDeAtencao(parada, AGORA));
  });

  it("não encobre um SLA estourado", () => {
    const nova = demanda({ id: "nova" });
    const estourada = demanda({
      id: "estourada",
      criadaEm: "2026-07-01T09:00:00Z",
      risco: "sla_estourado",
    });
    expect(pesoDeAtencao(estourada, AGORA)).toBeGreaterThan(pesoDeAtencao(nova, AGORA));
  });

  it("concluída continua no fim, mesmo sendo de hoje", () => {
    expect(pesoDeAtencao(demanda({ concluida: true }), AGORA)).toBe(-1);
  });

  it("ordena a recém-chegada à frente das antigas paradas", () => {
    const lista = [
      demanda({ id: "velha1", criadaEm: "2026-07-10T09:00:00Z", diasParada: 18, risco: "parada" }),
      demanda({ id: "nova", criadaEm: "2026-07-28T08:00:00Z" }),
      demanda({ id: "velha2", criadaEm: "2026-07-12T09:00:00Z", diasParada: 16, risco: "parada" }),
    ];
    // `ordenarPorAtencao` usa o relógio real; o teste cria a "nova" no mesmo
    // dia de execução para não depender de data fixa.
    const hoje = new Date();
    lista[1] = demanda({ id: "nova", criadaEm: hoje.toISOString() });
    expect(ordenarPorAtencao(lista)[0].id).toBe("nova");
  });
});
