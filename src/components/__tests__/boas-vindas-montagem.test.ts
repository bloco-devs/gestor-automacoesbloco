import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O `BoasVindas` carrega 240 quadros em 1920×1080 e roda um laço de
 * `requestAnimationFrame` que desenha em todo quadro de tela. Montar dois ao
 * mesmo tempo dobra tudo isso.
 *
 * Foi o que aconteceu: o `App` monta o splash como irmão da árvore de rotas, e
 * o `SsoCallback` — que vive DENTRO dessa árvore — montava outro. Em
 * `/sso/callback` os dois existiam juntos. O sintoma que chegou foi "a barra de
 * carregamento carrega duas vezes, uma sem o BLINK e outra com" e a tela
 * lagando.
 *
 * Este teste falha se algum outro lugar voltar a montá-lo.
 */
function arquivosFonte(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      if (nome === "__tests__" || nome === "node_modules") continue;
      arquivosFonte(caminho, acc);
    } else if (/\.tsx?$/.test(nome)) {
      acc.push(caminho);
    }
  }
  return acc;
}

describe("montagem do BoasVindas", () => {
  it("é montado em exatamente um lugar", () => {
    const montagens = arquivosFonte("src")
      .filter((f) => !f.endsWith("BoasVindas.tsx"))
      .filter((f) => /<BoasVindas[\s/>]/.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(/^src\//, ""));
    expect(montagens).toEqual(["App.tsx"]);
  });

  it("o SsoCallback não monta o splash — ele termina em recarga de página", () => {
    const sso = readFileSync("src/pages/SsoCallback.tsx", "utf8");
    expect(sso).not.toMatch(/<BoasVindas/);
    /* A recarga é o que justifica não montar aqui: o splash vem depois dela. */
    expect(sso).toMatch(/location\.replace/);
  });
});
