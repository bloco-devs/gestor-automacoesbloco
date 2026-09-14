/**
 * A BARRA DE FILTRO QUE ESCONDIA A CAIXA DE ENTRADA
 *
 * Relato do usuário: "a caixa de entrada sumiu". Ela não tinha sumido — estava
 * atrás da barra de filtro de projetos.
 *
 * A causa é uma classe só, `md:top-11`, na barra `sticky` de
 * `SelecaoDeProjetos`. `top-11` são 44px, e eram a altura da barra de abas
 * "Hoje · Demandas · Builder · DevTools" que o `WorkspaceShell` tinha. Essa
 * barra foi REMOVIDA de propósito (era uma segunda cópia da sidebar), e o
 * `WorkspaceShell` já desconta o header global na própria altura
 * (`100vh - var(--app-header-h)`). Não há mais nada de 44px acima.
 *
 * O estrago não é a faixa vazia — é o que ela tapa. `position: sticky` desloca
 * o elemento sem empurrar os irmãos: a barra desce 44px e cobre os primeiros
 * 44px da lista, que é exatamente a linha "Caixa de Entrada" (~42px de altura).
 *
 * POR QUE ISTO É UM TESTE, E NÃO UM COMENTÁRIO
 *
 * A classe já foi removida uma vez (`cd570435`) e voltou (`bfd33f8b`). Um
 * comentário não impede a próxima volta; nem `tsc`, nem o eslint, nem a suíte
 * têm qualquer opinião sobre uma classe de Tailwind a mais. Um teste que lê o
 * código-fonte tem.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SELECAO = join(
  process.cwd(),
  "src/modules/workspace-demandas/components/SelecaoDeProjetos.tsx",
);

/** Tira comentários, para o teste não se ofender com o aviso que explica a regra. */
function semComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

describe("a barra de filtro não cobre a Caixa de Entrada", () => {
  const codigo = semComentarios(readFileSync(SELECAO, "utf8"));

  it("a barra sticky não tem deslocamento vertical nenhum", () => {
    /*
     * Olha SÓ as classes que estão junto de `sticky`, e não o arquivo inteiro.
     *
     * A primeira versão deste teste varria tudo e reprovou por causa do
     * `top-1/2` do ícone de busca — que é centralização de um elemento
     * absoluto e não tem nada com a barra. Teste que reprova o que está certo
     * é removido na primeira vez que atrapalha, e aí não protege mais nada.
     */
    const barras = [...codigo.matchAll(/className="([^"]*\bsticky\b[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(barras.length, "nenhuma barra sticky encontrada").toBeGreaterThan(0);

    for (const classes of barras) {
      const deslocamentos = classes.match(/\b(?:sm:|md:|lg:|xl:)?top-(?!0\b)[\w/.]+/g) ?? [];
      expect(deslocamentos, `deslocamento em "${classes}"`).toEqual([]);
    }
  });

  it("a Caixa de Entrada continua sendo desenhada acima dos projetos", () => {
    // Se alguém mover a linha para dentro da lista ordenada, ela deixa de ser
    // "o primeiro lugar que se olha" e vira mais um projeto — o motivo pelo
    // qual ela foi posta em cima está no comentário do `LinhaDaInbox`.
    const inbox = codigo.indexOf("<LinhaDaInbox");
    const lista = codigo.indexOf("visiveis.length === 0");
    expect(inbox, "LinhaDaInbox não encontrada").toBeGreaterThan(-1);
    expect(lista, "lista de projetos não encontrada").toBeGreaterThan(-1);
    expect(inbox).toBeLessThan(lista);
  });

  it("a linha da Caixa de Entrada nunca deixa de ser desenhada por estar vazia", () => {
    // Com zero aguardando ela mostra "vazia". Esconder a linha quando não há
    // nada faria a caixa de entrada desaparecer justamente no dia em que está
    // em dia — e "sumiu" é o que o usuário relata quando isso acontece.
    expect(codigo).toContain("vazia");
  });
});
