import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import {
  HeaderContexto,
  HeaderContextoProvider,
  useContextoDeHeader,
  useHeaderTemContexto,
} from "../HeaderContexto";

/**
 * O que estes testes protegem
 *
 * O slot registra conteúdo por efeito e guarda numa pilha. Duas coisas podem
 * dar errado de forma silenciosa e cara:
 *
 * 1. Loop de render — registrar chama `setState`, que re-renderiza a página,
 *    que registraria de novo. Se as `deps` não segurarem, a tela trava. O
 *    primeiro teste conta renders para provar que estabiliza.
 * 2. Contexto órfão — uma página que desmonta precisa devolver o header a
 *    quem estava antes, não esvaziá-lo.
 */

function Pagina({ texto, aoRenderizar }: { texto: string; aoRenderizar?: () => void }) {
  aoRenderizar?.();
  useContextoDeHeader(<span>{texto}</span>, [texto]);
  return <p>corpo {texto}</p>;
}

function Header() {
  const tem = useHeaderTemContexto();
  return <header>{tem ? <HeaderContexto /> : <span>breadcrumb</span>}</header>;
}

describe("slot de contexto do header", () => {
  it("estabiliza — registrar não realimenta o render da página", () => {
    let renders = 0;
    render(
      <HeaderContextoProvider>
        <Header />
        <Pagina texto="projeto A" aoRenderizar={() => (renders += 1)} />
      </HeaderContextoProvider>,
    );
    expect(screen.getByText("projeto A")).toBeInTheDocument();
    // Um render inicial e, no máximo, um por conta do setState do registro.
    expect(renders).toBeLessThanOrEqual(3);
  });

  it("o contexto da página tem precedência sobre o breadcrumb", () => {
    render(
      <HeaderContextoProvider>
        <Header />
        <Pagina texto="projeto A" />
      </HeaderContextoProvider>,
    );
    expect(screen.queryByText("breadcrumb")).not.toBeInTheDocument();
  });

  it("sem página preenchendo, o breadcrumb volta", () => {
    render(
      <HeaderContextoProvider>
        <Header />
      </HeaderContextoProvider>,
    );
    expect(screen.getByText("breadcrumb")).toBeInTheDocument();
  });

  it("desmontar devolve o header a quem estava antes, em vez de esvaziar", () => {
    function Arvore() {
      const [filhaVisivel, setFilhaVisivel] = useState(true);
      return (
        <HeaderContextoProvider>
          <Header />
          <Pagina texto="mae" />
          {filhaVisivel && <Pagina texto="filha" />}
          <button onClick={() => setFilhaVisivel(false)}>fechar</button>
        </HeaderContextoProvider>
      );
    }
    render(<Arvore />);
    expect(screen.getByText("filha")).toBeInTheDocument();
    fireEvent.click(screen.getByText("fechar"));
    expect(screen.getByText("mae")).toBeInTheDocument();
  });
});
