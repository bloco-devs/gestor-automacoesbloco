import { describe, it, expect } from "vitest";

/**
 * A matemática de "onde o cartão cai".
 *
 * Ela vive dentro de `aoTerminar`, no BoardLente, junto do dnd-kit. Aqui ela é
 * reproduzida isolada para provar os casos de borda — o cartão do meio, o
 * primeiro, o último, a coluna vazia e o movimento dentro da mesma coluna.
 * São exatamente os casos que um arrasta-e-solta erra sem ninguém notar.
 */
function novaOrdem(itens: string[], arrastado: string, vizinho: string | null): string[] {
  const sem = itens.filter((i) => i !== arrastado);
  const pos = vizinho ? sem.indexOf(vizinho) : sem.length;
  const out = [...sem];
  out.splice(pos < 0 ? sem.length : pos, 0, arrastado);
  return out;
}

describe("posição do cartão ao soltar", () => {
  it("soltar sobre o primeiro cartão coloca o arrastado no topo", () => {
    // O caso relatado: o cartão sempre ia para baixo, nunca para o topo.
    expect(novaOrdem(["a", "b", "c"], "x", "a")).toEqual(["x", "a", "b", "c"]);
  });

  it("soltar sobre um cartão do meio insere ACIMA dele", () => {
    expect(novaOrdem(["a", "b", "c"], "x", "b")).toEqual(["a", "x", "b", "c"]);
  });

  it("soltar na coluna (sem vizinho) manda para o fim", () => {
    expect(novaOrdem(["a", "b", "c"], "x", null)).toEqual(["a", "b", "c", "x"]);
  });

  it("coluna vazia recebe o cartão sozinho", () => {
    expect(novaOrdem([], "x", null)).toEqual(["x"]);
  });

  it("mover dentro da mesma coluna não duplica o cartão", () => {
    // Sem remover o arrastado antes de calcular a posição, ele apareceria duas
    // vezes — e o `reorder` gravaria duas linhas para o mesmo card.
    expect(novaOrdem(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(novaOrdem(["a", "b", "c"], "a", "c")).toEqual(["b", "a", "c"]);
  });

  it("subir o último para o topo", () => {
    expect(novaOrdem(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
  });

  it("vizinho inexistente cai no fim em vez de quebrar", () => {
    // indexOf devolve -1; sem a guarda, o splice inseriria de trás para frente.
    expect(novaOrdem(["a", "b"], "x", "naoexiste")).toEqual(["a", "b", "x"]);
  });

  it("a coluna nunca perde nem repete cartao", () => {
    const r = novaOrdem(["a", "b", "c", "d"], "d", "b");
    expect(r).toHaveLength(4);
    expect(new Set(r).size).toBe(4);
    expect(r).toEqual(["a", "d", "b", "c"]);
  });
});
