import { describe, it, expect } from "vitest";
import { casarSistema } from "../casarSistema";

const CATALOGO = [
  { id: "uuid-rh", nome: "Gestor de RH" },
  { id: "uuid-sgpo", nome: "SGPO" },
  { id: "uuid-com", nome: "Gestão Comercial" },
  { id: "uuid-obra", nome: "Gestão de Obra" },
];

describe("casarSistema", () => {
  it("casa nome idêntico", () => {
    expect(casarSistema("Gestão Comercial", CATALOGO)).toBe("uuid-com");
  });

  it("ignora acento, caixa e pontuação", () => {
    expect(casarSistema("gestao comercial", CATALOGO)).toBe("uuid-com");
    expect(casarSistema("GESTÃO  COMERCIAL", CATALOGO)).toBe("uuid-com");
  });

  it("casa por continência — o caso real do SGPO", () => {
    // O ecossistema chama de "Gestão de Processo / SGPO"; a tabela local, só "SGPO".
    expect(casarSistema("Gestão de Processo / SGPO", CATALOGO)).toBe("uuid-sgpo");
  });

  it("devolve null quando não há correspondente", () => {
    // Melhor um chamado "REQ" honesto que um sistema errado.
    expect(casarSistema("Sistema de Ponto Eletrônico", CATALOGO)).toBeNull();
  });

  it("não casa por sigla curta demais", () => {
    // "RH" dentro de qualquer palavra viraria falso positivo.
    expect(casarSistema("RH", CATALOGO)).toBeNull();
  });

  it("nome vazio ou ausente não casa nada", () => {
    expect(casarSistema(null, CATALOGO)).toBeNull();
    expect(casarSistema(undefined, CATALOGO)).toBeNull();
    expect(casarSistema("   ", CATALOGO)).toBeNull();
  });

  it("catálogo vazio devolve null, sem quebrar", () => {
    expect(casarSistema("Gestor de RH", [])).toBeNull();
  });
});
