import { describe, expect, it } from "vitest";
import { ADMIN_GROUPS, ADMIN_NAV, ADMIN_QUICK_ACTIONS, groupNav } from "../navigation/registry";
import { searchAdminNav } from "../utils/search";

describe("admin-shell / navigation registry", () => {
  it("agrupa navegação por categoria", () => {
    const groups = groupNav();
    expect(groups.map((g) => g.id)).toEqual(ADMIN_GROUPS.map((g) => g.id));
    for (const g of groups) {
      expect(g.items.every((it) => it.group === g.id)).toBe(true);
    }
  });

  it("todos os itens têm rota não vazia", () => {
    expect(ADMIN_NAV.every((it) => it.href.startsWith("/"))).toBe(true);
  });

  it("quick actions apontam apenas para rotas conhecidas", () => {
    for (const q of ADMIN_QUICK_ACTIONS) {
      expect(q.href.startsWith("/")).toBe(true);
    }
  });

  it("categorias cobrem os cinco grupos exigidos", () => {
    const ids = new Set(ADMIN_GROUPS.map((g) => g.id));
    ["plataforma", "ia", "operacional", "seguranca", "desenvolvimento"].forEach((id) =>
      expect(ids.has(id as any)).toBe(true),
    );
  });
});

describe("admin-shell / search", () => {
  it("filtra por label", () => {
    const r = searchAdminNav(ADMIN_NAV, "analytics");
    expect(r.some((it) => it.id === "analytics")).toBe(true);
  });

  it("é case + diacrítico insensível", () => {
    const r = searchAdminNav(ADMIN_NAV, "SAUDE");
    expect(r.some((it) => it.id === "saude")).toBe(true);
  });

  it("busca em keywords", () => {
    const r = searchAdminNav(ADMIN_NAV, "afinidade");
    expect(r.some((it) => it.id === "routing")).toBe(true);
  });

  it("query vazia retorna tudo", () => {
    expect(searchAdminNav(ADMIN_NAV, "  ").length).toBe(ADMIN_NAV.length);
  });

  it("query sem match retorna vazio", () => {
    expect(searchAdminNav(ADMIN_NAV, "zzz_nao_existe")).toEqual([]);
  });
});
