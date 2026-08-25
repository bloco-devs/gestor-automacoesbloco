import { describe, expect, it } from "vitest";
import { distribuirEmLinhas } from "../services/rotulos-do-medidor";

/**
 * O DEFEITO QUE ESTES TESTES TRANCAM
 *
 * As faixas cadastradas têm degraus em 80%, 100%, 100,01% e 120%. Os dois do
 * meio distam um centésimo de ponto percentual — na régua, o mesmo pixel. Como
 * cada rótulo era posicionado por `left` absoluto sem olhar o vizinho, os dois
 * eram desenhados um sobre o outro: "R$ 1.000,00" e "a definir" impressos no
 * mesmo lugar, ilegíveis.
 *
 * O relato de quem usou o sistema foi "remuneração com barra, textos bugados".
 * Era isto.
 */
describe("distribuirEmLinhas — rótulos do medidor não se sobrepõem", () => {
  it("mantém na primeira linha os rótulos que têm espaço entre si", () => {
    expect(distribuirEmLinhas([0, 20, 40, 60, 80])).toEqual([0, 0, 0, 0, 0]);
  });

  it("desce para a segunda linha o rótulo que cairia sobre o vizinho", () => {
    // O caso real: 100% e 100,01% viram praticamente a mesma posição.
    expect(distribuirEmLinhas([57.9, 72.4, 72.41, 86.9])).toEqual([0, 0, 1, 0]);
  });

  it("nunca devolve duas posições próximas na mesma linha", () => {
    const posicoes = [10, 10.01, 10.02, 45, 45.5, 80];
    const linhas = distribuirEmLinhas(posicoes);

    // Para cada par que compartilha linha, a distância respeita a largura do
    // rótulo — que é a definição de "não se sobrepõem".
    for (let i = 0; i < posicoes.length; i++) {
      for (let j = i + 1; j < posicoes.length; j++) {
        if (linhas[i] === linhas[j]) {
          expect(Math.abs(posicoes[i] - posicoes[j])).toBeGreaterThanOrEqual(10);
        }
      }
    }
  });

  it("abre uma linha nova quando três degraus se encostam", () => {
    // Com duas linhas fixas, o terceiro voltava a cair sobre o segundo. Quantos
    // degraus se encostam depende das faixas que o RH cadastra, não do desenho.
    expect(distribuirEmLinhas([0, 0.1, 0.2])).toEqual([0, 1, 2]);
  });

  it("não abre linha que não precisa: dois degraus longe ficam ambos em cima", () => {
    expect(distribuirEmLinhas([0, 50])).toEqual([0, 0]);
  });

  it("libera a linha de cima quando o rótulo seguinte já tem espaço", () => {
    // 0 e 5 colidem (5 vai para baixo); 30 já cabe em cima outra vez.
    expect(distribuirEmLinhas([0, 5, 30])).toEqual([0, 1, 0]);
  });

  it("não quebra com lista vazia nem com um rótulo só", () => {
    expect(distribuirEmLinhas([])).toEqual([]);
    expect(distribuirEmLinhas([42])).toEqual([0]);
  });
});
