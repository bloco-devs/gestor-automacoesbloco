import { describe, it, expect } from "vitest";
import { generoDe, ordenarAnexos, resumirAnexos, visualizavel, type Anexo } from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * "Um print vale por quarenta mensagens" só é verdade se o print for visto. Se
 * a classificação errar, uma imagem vira um retângulo cinza com botão de
 * baixar — e aí ela não vale nada, porque ninguém baixa, abre noutro programa
 * e volta.
 */

function anexo(nome: string, tipo: string | null, em = "2026-03-01"): Anexo {
  return { id: nome, nome, caminho: `d/${nome}`, genero: generoDe(nome, tipo), tipo, em, autorId: null };
}

describe("classificação de anexos", () => {
  it("a extensão vence o tipo declarado — sistemas mentem sobre MIME", () => {
    // Um octet-stream chamado erro.png é um png. Confiar só no MIME
    // transformaria o print mais importante da demanda num ícone genérico.
    expect(generoDe("erro.png", "application/octet-stream")).toBe("imagem");
    expect(generoDe("captura.mp4", "")).toBe("video");
    expect(generoDe("stack.log", null)).toBe("log");
  });

  it("cai no tipo declarado quando o nome não ajuda", () => {
    expect(generoDe("arquivo-sem-extensao", "image/webp")).toBe("imagem");
    expect(generoDe(null, "application/pdf")).toBe("pdf");
    expect(generoDe(null, null)).toBe("outro");
  });

  it("sabe o que dá para ver sem baixar", () => {
    expect(visualizavel("imagem")).toBe(true);
    expect(visualizavel("video")).toBe(true);
    expect(visualizavel("pdf")).toBe(true);
    expect(visualizavel("log")).toBe(true);
    // Um .zip não tem preview possível — e um retângulo cinza seria pior que
    // o nome do arquivo, que ao menos ajuda a decidir se vale abrir.
    expect(visualizavel("pacote")).toBe(false);
    expect(visualizavel("outro")).toBe(false);
  });
});

describe("ordem dos anexos", () => {
  it("imagem antes de tudo, mesmo sendo mais antiga", () => {
    // Maior densidade de informação por segundo de atenção. Quem abre uma
    // demanda com um print e um zip precisa ver o print sem rolar.
    const lista = ordenarAnexos([
      anexo("pacote.zip", null, "2026-03-10"),
      anexo("print.png", null, "2026-03-01"),
      anexo("erro.log", null, "2026-03-09"),
    ]);
    expect(lista.map((a) => a.genero)).toEqual(["imagem", "log", "pacote"]);
  });

  it("dentro do mesmo gênero, o mais recente vem antes", () => {
    // Numa demanda longa, o print de hoje explica melhor que o de três
    // semanas atrás.
    const lista = ordenarAnexos([
      anexo("antigo.png", null, "2026-03-01"),
      anexo("novo.png", null, "2026-03-15"),
    ]);
    expect(lista.map((a) => a.nome)).toEqual(["novo.png", "antigo.png"]);
  });
});

describe("resumo para o briefing", () => {
  it("conta por gênero e usa plural certo", () => {
    const texto = resumirAnexos([anexo("a.png", null), anexo("b.png", null), anexo("c.log", null)]);
    expect(texto).toBe("2 imagens, 1 log");
  });

  it("sem anexos devolve null — a linha não aparece em vez de dizer 'nenhum'", () => {
    expect(resumirAnexos([])).toBeNull();
  });
});
