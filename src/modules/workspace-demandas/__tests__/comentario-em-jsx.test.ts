/**
 * O comentário que virou texto na tela.
 *
 * Eu escrevi um `/* ... *\/` como filho de JSX em `SelecaoDeProjetos`. Em
 * posição de filho, JSX trata isso como TEXTO, não como comentário — e o
 * bloco inteiro foi renderizado no topo da lista de projetos, em produção,
 * porque `tsc`, o eslint e a suíte não têm nada contra texto.
 *
 * A forma correta em filho de JSX é `{/* ... *\/}`. Este teste varre o `src`
 * inteiro procurando a forma errada.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = join(process.cwd(), "src");

function tsx(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return tsx(caminho);
    return caminho.endsWith(".tsx") ? [caminho] : [];
  });
}

describe("comentário nunca vira texto na tela", () => {
  const arquivos = tsx(RAIZ);

  it("encontrou os arquivos .tsx", () => {
    expect(arquivos.length).toBeGreaterThan(50);
  });

  /*
   * A heurística: uma linha que ABRE um bloco de comentário logo depois de uma
   * linha que fecha uma tag JSX (`>`), sem o `{` que faz do bloco uma
   * expressão. É exatamente a assinatura do defeito, e não pega o caso legítimo
   * de comentário depois de `return (`, que termina em `(`.
   */
  it("nenhum bloco /* */ solto em posição de filho de JSX", () => {
    const infratores: string[] = [];
    for (const caminho of arquivos) {
      const linhas = readFileSync(caminho, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        if (!linha.trim().startsWith("/*")) return;
        let j = i - 1;
        while (j >= 0 && !linhas[j].trim()) j -= 1;
        if (j < 0) return;
        const anterior = linhas[j].trimEnd();
        // Fecha tag JSX e não é auto-fechamento de atributo: filho de JSX.
        if (anterior.endsWith(">") && !anterior.endsWith("=>")) {
          infratores.push(`${caminho.slice(RAIZ.length + 1)}:${i + 1}`);
        }
      });
    }
    expect(infratores).toEqual([]);
  });
});
