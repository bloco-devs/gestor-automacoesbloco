import { describe, expect, it } from "vitest";
import { getNavigation, listAliases, listProfiles, resolveProfile, resolveRoute } from "../";

describe("navigation registry", () => {
  it("exposes 4 profiles", () => {
    expect(listProfiles().sort()).toEqual(["admin", "gestao", "portal", "workspace"]);
  });

  it("has canonical home per profile", () => {
    expect(getNavigation("portal").home).toBe("/portal/inicio");
    expect(getNavigation("workspace").home).toBe("/workspace/hoje");
    expect(getNavigation("gestao").home).toBe("/gestao/panorama");
    expect(getNavigation("admin").home).toBe("/admin/plataforma");
  });

  it("has no duplicated item ids across profiles", () => {
    const ids: string[] = [];
    for (const p of listProfiles()) {
      for (const g of getNavigation(p).groups) for (const i of g.items) ids.push(i.id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves legacy aliases to canonical routes", () => {
    expect(resolveRoute("/atividades")).toBe("/workspace/demandas");
    expect(resolveRoute("/solicitacoes/kanban")).toBe("/workspace/demandas");
    expect(resolveRoute("/dashboard")).toBe("/workspace/hoje");
    expect(resolveRoute("/command-center")).toBe("/gestao/panorama");
    expect(resolveRoute("/admin")).toBe("/admin/plataforma");
  });

  it("returns input for unknown routes", () => {
    expect(resolveRoute("/desconhecido")).toBe("/desconhecido");
  });

  it("maps route to profile", () => {
    expect(resolveProfile("/atividades")).toBe("workspace");
    expect(resolveProfile("/minhas-solicitacoes")).toBe("portal");
    expect(resolveProfile("/admin/security")).toBe("admin");
  });

  it("does not duplicate aliases", () => {
    const froms = listAliases().map((a) => a.from);
    expect(new Set(froms).size).toBe(froms.length);
  });
});
