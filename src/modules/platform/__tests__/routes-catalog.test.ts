import { describe, it, expect } from "vitest";
import { catalogoDeRotas } from "../registry/routes-catalog";

/**
 * O que estes testes protegem: a paleta é o que torna honesto tirar 56 itens do
 * menu. Se o catálogo encolher ou perder as páginas administrativas, o menu
 * enxuto vira esconderijo — telas ficariam inalcançáveis sem ninguém notar.
 */
describe("platform/routes-catalog", () => {
  const catalogo = catalogoDeRotas();

  it("indexa muito mais que os 16 destinos originais", () => {
    expect(catalogo.length).toBeGreaterThan(50);
  });

  it("alcança as páginas administrativas que saíram do menu", () => {
    const rotas = catalogo.map((c) => c.route);
    for (const rota of ["/admin/saude", "/admin/analytics", "/admin/integracoes"]) {
      expect(rotas).toContain(rota);
    }
  });

  it("trata lentes e filas como destinos, porque é assim que o usuário pensa", () => {
    const ids = catalogo.map((c) => c.id);
    expect(ids).toContain("lente:gantt");
    expect(ids).toContain("fila:em_risco");
  });

  it("não repete rota", () => {
    const rotas = catalogo.map((c) => c.route);
    expect(new Set(rotas).size).toBe(rotas.length);
  });

  it("todo destino tem título e categoria, para a paleta poder agrupar", () => {
    for (const item of catalogo) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.category).toBeTruthy();
    }
  });

  it("restringe as telas administrativas a quem tem acesso", () => {
    const admin = catalogo.find((c) => c.route === "/admin/saude");
    expect(admin?.permissions).toEqual(["developer", "administrador"]);
  });
});
