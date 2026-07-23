import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ManagerShell } from "../ManagerShell";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ManagerShell hideCopilot>
        <div data-testid="content">conteudo</div>
      </ManagerShell>
    </MemoryRouter>,
  );
}

describe("ManagerShell (FEATURE 026.4)", () => {
  beforeEach(() => window.localStorage.clear());

  it("expõe as 5 abas: Panorama, Equipe, Demandas, Insights, Inbox", () => {
    renderAt("/gestao/panorama");
    for (const label of ["Panorama", "Equipe", "Demandas", "Insights", "Inbox"]) {
      expect(screen.getByRole("link", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  it("não expõe entradas antigas (Operations, Command Center, Analytics, Saúde)", () => {
    renderAt("/gestao/panorama");
    expect(screen.queryByRole("link", { name: /Operations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Command Center/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Analytics$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Saúde$/i })).not.toBeInTheDocument();
  });

  it("renderiza o conteúdo (slot)", () => {
    renderAt("/gestao/panorama");
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});
