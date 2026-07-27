import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A guarda de vocabulário e de acoplamento do fluxo de demandas.
 *
 * POR QUE UM TESTE E NÃO UMA CONVENÇÃO
 * "Quadro" não é uma palavra ruim: é a palavra de outro produto. Ela entrou
 * aqui pela importação do Trello e ensinava o modelo mental errado — que a
 * coisa que se abre é um quadro, e que o Board é onde o trabalho mora. O
 * modelo correto é `Demandas → Projeto → Lente`, com o Board sendo uma das
 * cinco lentes e nunca o objeto central.
 *
 * Vocabulário volta sozinho: alguém copia um componente antigo e em três meses
 * metade da tela fala Trello de novo. Este teste é o que impede.
 *
 * Ele olha só para **texto entre aspas**, não para comentários — nos
 * comentários "quadro" é a palavra certa, porque lá se descreve de onde os
 * dados de fato vêm hoje.
 */

const RAIZ = dirname(fileURLToPath(import.meta.url)).replace(/\/__tests__$/, "");

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return nome === "__tests__" ? [] : arquivos(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

describe("vocabulário e acoplamento do fluxo de demandas", () => {
  const fontes = arquivos(RAIZ).map((caminho) => ({
    caminho: caminho.slice(RAIZ.length + 1),
    codigo: readFileSync(caminho, "utf8"),
  }));

  it("encontrou os arquivos do módulo", () => {
    expect(fontes.length).toBeGreaterThan(5);
  });

  it("nenhum texto visível chama um projeto de 'quadro'", () => {
    const infratores = fontes.filter((f) => /["'`][^"'`]*[Qq]uadro/.test(semComentarios(f.codigo)));
    expect(infratores.map((f) => f.caminho)).toEqual([]);
  });

  it("nenhum texto visível usa 'Atividades' como nome de destino", () => {
    const infratores = fontes.filter((f) =>
      /["'`][^"'`]*Atividades[^"'`]*["'`]/.test(semComentarios(f.codigo)),
    );
    expect(infratores.map((f) => f.caminho)).toEqual([]);
  });

  it("a UI não importa componentes nem páginas herdadas do Trello", () => {
    const proibidos = [
      "@/pages/Atividades",
      "@/pages/AtividadesBoard",
      "@/components/atividades",
      "@/lib/atividades",
      "@/hooks/useAtividades",
    ];
    const infratores = fontes.filter((f) => proibidos.some((p) => f.codigo.includes(`from "${p}`)));
    expect(infratores.map((f) => f.caminho)).toEqual([]);
  });

  it("a UI não conhece as tabelas: nada de useDemands nem de AtividadeCard", () => {
    const infratores = fontes.filter((f) =>
      /from "@\/modules\/demands|from "@\/hooks\/useDemands/.test(f.codigo),
    );
    expect(infratores.map((f) => f.caminho)).toEqual([]);
  });
});
