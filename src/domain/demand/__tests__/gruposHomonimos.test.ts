import { describe, it, expect } from "vitest";
import { unirGruposHomonimos, type Demanda, type Grupo } from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A fila "Hoje" soma duas fontes. A coluna "Backlog" de um quadro e o status
 * "backlog" de `demands` são registros diferentes com o mesmo nome — na tela
 * viravam dois blocos "BACKLOG" seguidos, e quem olha conclui que a demanda
 * foi duplicada. Fundir por rótulo resolve, desde que não invente nada:
 * nenhuma demanda pode sumir e nenhum bloco em aberto pode ser marcado como
 * concluído (bloco concluído é recolhido pela lista, e recolher trabalho em
 * aberto é o pior erro possível aqui).
 */

function demanda(id: string, concluida = false): Demanda {
  return {
    id,
    referencia: `#${id}`,
    titulo: `Demanda ${id}`,
    descricao: "",
    status: { id: "x", rotulo: "Backlog", categoria: "aberta", ordem: 0 },
    prioridade: null,
    tipo: null,
    complexidade: null,
    sistema: null,
    responsaveis: [],
    autor: null,
    criadaEm: "2026-07-01",
    atualizadaEm: "2026-07-01",
    diasParada: 0,
    prazo: null,
    sla: null,
    ia: null,
    progresso: null,
    comentarios: null,
    anexos: null,
    etiquetas: [],
    concluida,
    risco: null,
    fonte: "demands",
  };
}

function grupo(id: string, rotulo: string, itens: Demanda[], concluido?: boolean): Grupo {
  return { id, rotulo, itens, concluido };
}

describe("unirGruposHomonimos", () => {
  it("funde blocos com o mesmo rótulo vindos de fontes diferentes", () => {
    const r = unirGruposHomonimos([
      grupo("uuid-da-coluna", "Backlog", [demanda("a")]),
      grupo("backlog", "Backlog", [demanda("b"), demanda("c")]),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].itens.map((d) => d.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("não perde nenhuma demanda ao fundir", () => {
    const entrada = [
      grupo("g1", "A Fazer", [demanda("a")]),
      grupo("g2", "Backlog", [demanda("b")]),
      grupo("g3", "a fazer", [demanda("c")]),
    ];
    const total = entrada.reduce((n, g) => n + g.itens.length, 0);
    const r = unirGruposHomonimos(entrada);
    expect(r.reduce((n, g) => n + g.itens.length, 0)).toBe(total);
  });

  it("ignora diferença de caixa e espaço em volta", () => {
    const r = unirGruposHomonimos([
      grupo("g1", "Em Andamento", [demanda("a")]),
      grupo("g2", "  em andamento ", [demanda("b")]),
    ]);
    expect(r).toHaveLength(1);
  });

  it("mantém blocos de rótulos diferentes separados", () => {
    const r = unirGruposHomonimos([
      grupo("g1", "Backlog", [demanda("a")]),
      grupo("g2", "Concluído", [demanda("b", true)]),
    ]);
    expect(r).toHaveLength(2);
  });

  it("só continua concluído se as duas metades eram", () => {
    const r = unirGruposHomonimos([
      grupo("g1", "Feito", [demanda("a", true)], true),
      grupo("g2", "Feito", [demanda("b")], false),
    ]);
    expect(r[0].concluido).toBe(false);
  });

  it("preserva concluído quando as duas metades estavam concluídas", () => {
    const r = unirGruposHomonimos([
      grupo("g1", "Feito", [demanda("a", true)], true),
      grupo("g2", "Feito", [demanda("b", true)], true),
    ]);
    expect(r[0].concluido).toBe(true);
  });
});
