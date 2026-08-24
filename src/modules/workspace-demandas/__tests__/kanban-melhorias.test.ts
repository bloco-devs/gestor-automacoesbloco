import { describe, expect, it } from "vitest";
import {
  agruparPorStatus,
  buscar,
  ordenarPorConclusao,
  sinaisUteis,
  type Demanda,
} from "@/domain/demand";

function criarDemanda(override: Partial<Demanda>): Demanda {
  return {
    id: "d1",
    referencia: "#d1",
    titulo: "Demanda Teste",
    descricao: "Descrição teste",
    status: { id: "concluido", rotulo: "Concluído", categoria: "concluida", ordem: 5 },
    prioridade: "media",
    tipo: "melhoria",
    complexidade: "facil",
    sistema: { id: "s1", nome: "Sienge" },
    responsaveis: [],
    autor: null,
    criadaEm: "2026-08-20T10:00:00Z",
    atualizadaEm: "2026-08-20T12:00:00Z",
    diasParada: 0,
    prazo: null,
    sla: null,
    ia: null,
    progresso: null,
    comentarios: null,
    anexos: null,
    etiquetas: [],
    concluida: true,
    risco: null,
    fonte: "demands",
    ...override,
  };
}

describe("Melhorias do Kanban (Demandas 1 a 7)", () => {
  describe("Demanda 6: Concluídas ordenadas por atualização mais recente no topo", () => {
    it("ordena demandas concluídas por atualizadaEm decrescente", () => {
      const dAntiga = criarDemanda({ id: "d-antiga", titulo: "Antiga", atualizadaEm: "2026-08-20T08:00:00Z" });
      const dRecente = criarDemanda({ id: "d-recente", titulo: "Recente", atualizadaEm: "2026-08-23T20:00:00Z" });
      const dMedia = criarDemanda({ id: "d-media", titulo: "Média", atualizadaEm: "2026-08-22T10:00:00Z" });

      const ordenadas = ordenarPorConclusao([dAntiga, dRecente, dMedia]);
      expect(ordenadas.map((d) => d.id)).toEqual(["d-recente", "d-media", "d-antiga"]);
    });

    it("agruparPorStatus coloca a demanda recém-concluída em primeiro lugar", () => {
      const dAntiga = criarDemanda({ id: "d1", titulo: "Concluída Ontem", atualizadaEm: "2026-08-22T10:00:00Z" });
      const dNova = criarDemanda({ id: "d2", titulo: "Concluída Agora", atualizadaEm: "2026-08-23T22:00:00Z" });

      const grupos = agruparPorStatus([dAntiga, dNova]);
      const grupoConcluido = grupos.find((g) => g.id === "concluido");

      expect(grupoConcluido).toBeDefined();
      expect(grupoConcluido?.itens[0].id).toBe("d2");
    });
  });

  describe("Demanda 2: Sinal de complexidade no Kanban", () => {
    it("identifica sinal de complexidade como true quando há diversidade", () => {
      const d1 = criarDemanda({ id: "d1", complexidade: "facil" });
      const d2 = criarDemanda({ id: "d2", complexidade: "dificil" });

      const sinais = sinaisUteis([d1, d2]);
      expect(sinais.complexidade).toBe(true);
    });

    it("identifica sinal de complexidade como false quando são todas iguais", () => {
      const d1 = criarDemanda({ id: "d1", complexidade: "media" });
      const d2 = criarDemanda({ id: "d2", complexidade: "media" });

      const sinais = sinaisUteis([d1, d2]);
      expect(sinais.complexidade).toBe(false);
    });
  });

  describe("Demanda 5: Busca por código ou nome na coluna", () => {
    const d1 = criarDemanda({ id: "d1", referencia: "REQ-2608-0057", titulo: "Seleção múltipla de pavimentos", sistema: { id: "s1", nome: "Pavimentos" } });
    const d2 = criarDemanda({ id: "d2", referencia: "REQ-2608-0058", titulo: "Ajuste de faturamento Sienge", sistema: { id: "s2", nome: "Sienge" } });

    it("encontra demanda por código exato ou parcial", () => {
      expect(buscar([d1, d2], "2608-0057").map((d) => d.id)).toEqual(["d1"]);
      expect(buscar([d1, d2], "REQ-2608").map((d) => d.id)).toEqual(["d1", "d2"]);
    });

    it("encontra demanda por termo do título sem case sensitivity", () => {
      expect(buscar([d1, d2], "SELEÇÃO MÚLTIPLA").map((d) => d.id)).toEqual(["d1"]);
      expect(buscar([d1, d2], "sienge").map((d) => d.id)).toEqual(["d2"]);
    });
  });
});
