import { describe, it, expect } from "vitest";
import { dobrarMudancas, representanteDaDobra } from "../services/dobrarMudancas";
import type { Evento } from "../services/fio";

function ev(id: string, tipo: Evento["tipo"], texto = ""): Evento {
  return { id, tipo, autor: null, em: "2026-07-29T12:00:00Z", texto, interna: false } as Evento;
}

describe("dobrarMudancas", () => {
  it("dobra uma sequência de três ou mais mudanças", () => {
    const itens = dobrarMudancas([
      ev("1", "fala"),
      ev("2", "mudanca"),
      ev("3", "mudanca"),
      ev("4", "mudanca"),
      ev("5", "fala"),
    ]);
    expect(itens.map((i) => i.tipo)).toEqual(["evento", "dobra", "evento"]);
    const dobra = itens[1];
    if (dobra.tipo !== "dobra") throw new Error("esperava dobra");
    expect(dobra.eventos).toHaveLength(3);
  });

  it("deixa duas mudanças em paz", () => {
    // Dobrar duas cobraria um clique para revelar o que já cabia na tela.
    const itens = dobrarMudancas([ev("1", "mudanca"), ev("2", "mudanca")]);
    expect(itens.map((i) => i.tipo)).toEqual(["evento", "evento"]);
  });

  it("uma fala no meio quebra a sequência", () => {
    const itens = dobrarMudancas([
      ev("1", "mudanca"),
      ev("2", "mudanca"),
      ev("3", "fala"),
      ev("4", "mudanca"),
      ev("5", "mudanca"),
    ]);
    // Nenhum dos dois lados chega a três: nada dobra, e a ordem se mantém.
    expect(itens.map((i) => i.tipo)).toEqual(["evento", "evento", "evento", "evento", "evento"]);
  });

  it("anexo também quebra a sequência — ele pede clique, não pode sumir dentro de uma dobra", () => {
    const itens = dobrarMudancas([
      ev("1", "mudanca"),
      ev("2", "mudanca"),
      ev("3", "mudanca"),
      ev("4", "anexo"),
      ev("5", "mudanca"),
    ]);
    expect(itens.map((i) => i.tipo)).toEqual(["dobra", "evento", "evento"]);
  });

  it("preserva a ordem e não perde nenhum evento", () => {
    const entrada = [
      ev("1", "fala"), ev("2", "mudanca"), ev("3", "mudanca"),
      ev("4", "mudanca"), ev("5", "mudanca"), ev("6", "fala"),
    ];
    const itens = dobrarMudancas(entrada);
    const ids: string[] = [];
    for (const i of itens) {
      if (i.tipo === "evento") ids.push(i.evento.id);
      else ids.push(...i.eventos.map((e) => e.id));
    }
    expect(ids).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("o representante é o mais recente: é ele quem diz o estado atual", () => {
    const seq = [ev("a", "mudanca", "moveu para Em Testes"),
                 ev("b", "mudanca", "moveu para Backlog"),
                 ev("c", "mudanca", "moveu para Concluído")];
    expect(representanteDaDobra(seq).texto).toBe("moveu para Concluído");
  });

  it("lista vazia devolve nada", () => {
    expect(dobrarMudancas([])).toEqual([]);
  });

  it("uma sequência que vai até o fim também dobra", () => {
    const itens = dobrarMudancas([
      ev("1", "fala"), ev("2", "mudanca"), ev("3", "mudanca"), ev("4", "mudanca"),
    ]);
    expect(itens.map((i) => i.tipo)).toEqual(["evento", "dobra"]);
  });
});
