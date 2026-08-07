import { describe, expect, it } from "vitest";
import { inserirNaLista, ordensDaLista, reordenarLista } from "../ordenacao";

describe("reordenarLista", () => {
  it("sobe um cartão para o topo", () => {
    expect(reordenarLista(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });

  it("desce um cartão para o fim", () => {
    expect(reordenarLista(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
  });

  it("move para o meio", () => {
    expect(reordenarLista(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("soltar sobre si mesmo não muda nada", () => {
    const ids = ["a", "b"];
    expect(reordenarLista(ids, "a", "a")).toBe(ids);
  });

  it("id inexistente devolve a lista intacta", () => {
    expect(reordenarLista(["a", "b"], "x", "a")).toEqual(["a", "b"]);
    expect(reordenarLista(["a", "b"], "a", "x")).toEqual(["a", "b"]);
  });

  it("lista de um item sobrevive", () => {
    expect(reordenarLista(["a"], "a", "a")).toEqual(["a"]);
  });

  it("nunca perde nem repete item", () => {
    const r = reordenarLista(["a", "b", "c", "d"], "b", "d");
    expect(r).toHaveLength(4);
    expect(new Set(r).size).toBe(4);
  });
});

describe("inserirNaLista", () => {
  it("insere acima do cartão de destino", () => {
    expect(inserirNaLista(["a", "b", "c"], "x", "b")).toEqual(["a", "x", "b", "c"]);
  });

  it("sem destino vai para o fim", () => {
    expect(inserirNaLista(["a", "b"], "x", null)).toEqual(["a", "b", "x"]);
  });

  it("coluna vazia recebe o cartão sozinho", () => {
    expect(inserirNaLista([], "x", null)).toEqual(["x"]);
  });

  it("destino inexistente cai no fim", () => {
    expect(inserirNaLista(["a", "b"], "x", "naoexiste")).toEqual(["a", "b", "x"]);
  });

  it("não duplica ao reinserir alguém que já estava na lista", () => {
    expect(inserirNaLista(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });
});

describe("ordensDaLista", () => {
  it("gera posições densas a partir de zero", () => {
    expect(ordensDaLista(["a", "b", "c"])).toEqual([
      { id: "a", ordem: 0 },
      { id: "b", ordem: 1 },
      { id: "c", ordem: 2 },
    ]);
  });

  it("lista vazia gera nada", () => {
    expect(ordensDaLista([])).toEqual([]);
  });
});
