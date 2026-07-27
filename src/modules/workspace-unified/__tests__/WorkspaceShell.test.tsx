import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceShell } from "../WorkspaceShell";
import { getNavigation } from "@/modules/navigation";

/**
 * Este arquivo antes exigia o contrário: que o shell mostrasse as abas
 * `Hoje · Demandas · Builder · DevTools`.
 *
 * A troca é deliberada. Aquelas abas repetiam, com os mesmos rótulos e os
 * mesmos ícones, os quatro primeiros itens da sidebar — 44px de altura para
 * exibir uma segunda cópia do menu que já estava 200px à esquerda.
 *
 * O que o teste protege agora é o que de fato importa: **os quatro destinos
 * continuam existindo**. Apagar navegação duplicada só é seguro se ninguém
 * perder o caminho — então o teste passou a olhar para o registro que alimenta
 * a sidebar e a paleta, em vez de olhar para pixels que eram redundantes.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell>
        <div data-testid="content">conteudo</div>
      </WorkspaceShell>
    </MemoryRouter>,
  );
}

describe("WorkspaceShell", () => {
  it("não repete a navegação da sidebar dentro do conteúdo", () => {
    renderAt("/workspace");
    expect(screen.queryByRole("link", { name: /Hoje/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Builder/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /DevTools/i })).not.toBeInTheDocument();
  });

  it("os quatro destinos seguem alcançáveis pela navegação do perfil", () => {
    const rotas = getNavigation("workspace").groups.flatMap((g) => g.items.map((i) => i.route));
    expect(rotas).toContain("/workspace");
    expect(rotas).toContain("/workspace/demandas");
    expect(rotas).toContain("/workspace/builder");
    expect(rotas).toContain("/workspace/devtools");
  });

  it("renderiza o conteúdo (slot)", () => {
    renderAt("/workspace");
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});
