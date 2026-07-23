import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkspaceShell } from "../WorkspaceShell";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell hideCopilot>
        <div data-testid="content">conteudo</div>
      </WorkspaceShell>
    </MemoryRouter>,
  );
}

describe("WorkspaceShell (FEATURE 026.3)", () => {
  beforeEach(() => window.localStorage.clear());

  it("mostra as 4 abas fixas: Hoje, Demandas, Builder, DevTools", () => {
    renderAt("/workspace");
    expect(screen.getByRole("link", { name: /Hoje/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Demandas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Builder/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /DevTools/i })).toBeInTheDocument();
  });

  it("não expõe Inbox nem Dashboard dentro do shell", () => {
    renderAt("/workspace");
    expect(screen.queryByRole("link", { name: /^Inbox$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Dashboard/i })).not.toBeInTheDocument();
  });

  it("renderiza o conteúdo (slot)", () => {
    renderAt("/workspace");
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});
