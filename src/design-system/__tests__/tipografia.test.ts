import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TYPOGRAPHY_CLASSES } from "../tokens/typography";

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, acc);
    else if (nome.endsWith(".tsx")) acc.push(caminho);
  }
  return acc;
}

const TODOS = arquivos("src");
const ARBITRARIOS = /text-\[[0-9.]+(px|rem)\]/g;

/**
 * Teto, não meta.
 *
 * São 467 tamanhos de fonte escritos à mão hoje. Trocar todos de uma vez não é
 * seguro: as classes `ds-*` também definem `line-height`, e NENHUM dos 156
 * `text-[10px]` declara um — a troca mexeria na altura da linha em todos eles.
 * Então o número não é zerado aqui; ele é congelado, para a dívida só poder
 * encolher. Ao migrar um trecho, baixe o teto junto.
 */
const TETO = 411;

describe("escala tipográfica", () => {
  it("a escala cobre os degraus que a interface realmente usa", () => {
    const css = readFileSync("src/index.css", "utf8");
    for (const classe of Object.values(TYPOGRAPHY_CLASSES)) {
      // `.ds-body-strong{` não tem espaço antes da chave; casar por regex evita
      // o falso negativo que um `includes(".classe ")` produz.
      const definida = new RegExp(`\\.${classe}\\s*\\{`).test(css);
      expect(definida, `${classe} sem definição no index.css`).toBe(true);
    }
    // 10px e 12px eram inventados justamente por não existirem na escala.
    expect(TYPOGRAPHY_CLASSES.micro).toBe("ds-micro");
    expect(TYPOGRAPHY_CLASSES.small).toBe("ds-small");
  });

  it("o número de tamanhos escritos à mão não cresce", () => {
    let total = 0;
    for (const arquivo of TODOS) {
      total += (readFileSync(arquivo, "utf8").match(ARBITRARIOS) ?? []).length;
    }
    expect(
      total,
      total > TETO
        ? `subiu para ${total}: use ds-micro (10px), ds-small (12px), ds-caption (13px) ou ds-body (14px)`
        : `desceu para ${total}: baixe o TETO em src/design-system/__tests__/tipografia.test.ts`,
    ).toBeLessThanOrEqual(TETO);
  });
});
