import { describe, it, expect, beforeEach } from "vitest";
import { NavigationRegistry } from "../registry/navigation-registry";
import { CommandRegistry } from "../registry/command-registry";
import { SearchRegistry } from "../registry/search-registry";
import { rank } from "../utils/ranking";
import { parseHotkey, matchesEvent, formatHotkey } from "../utils/hotkeys";

describe("NavigationRegistry", () => {
  let reg: NavigationRegistry;
  beforeEach(() => {
    reg = new NavigationRegistry();
  });

  it("registers, lists and resolves routes", () => {
    reg.register({ id: "inbox", title: "Inbox", route: "/trabalho/inbox", category: "Trabalho" });
    reg.register({ id: "dash", title: "Dashboard", route: "/dashboard", category: "Trabalho", permissions: ["developer"] });
    expect(reg.list()).toHaveLength(2);
    expect(reg.routeOf("inbox")).toBe("/trabalho/inbox");
    expect(reg.get("dash")?.title).toBe("Dashboard");
  });

  it("filters by role", () => {
    reg.register({ id: "a", title: "A", route: "/a", category: "Trabalho" });
    reg.register({ id: "b", title: "B", route: "/b", category: "Trabalho", permissions: ["developer"] });
    expect(reg.listFor("requester").map((i) => i.id)).toEqual(["a"]);
    expect(reg.listFor("developer").map((i) => i.id).sort()).toEqual(["a", "b"]);
    expect(reg.listFor(null).map((i) => i.id)).toEqual(["a"]);
  });
});

describe("CommandRegistry", () => {
  it("registers and filters by role", () => {
    const reg = new CommandRegistry();
    reg.register({ id: "c1", title: "C1", category: "Navegar", handler: () => {} });
    reg.register({
      id: "c2",
      title: "C2",
      category: "Configuração",
      handler: () => {},
      permissions: ["administrador"],
    });
    expect(reg.listFor("requester").map((c) => c.id)).toEqual(["c1"]);
    expect(reg.listFor("administrador").length).toBe(2);
  });
});

describe("SearchRegistry", () => {
  it("collects static + dynamic entities", async () => {
    const reg = new SearchRegistry();
    reg.register({ id: "s1", type: "solicitacao", label: "Solicitação 1" });
    reg.registerProvider("atividade", () => [
      { id: "a1", type: "atividade", label: "Card A" },
    ]);
    const list = await reg.collect();
    expect(list).toHaveLength(2);
    expect(list.find((e) => e.id === "a1")?.type).toBe("atividade");
  });

  it("swallows provider errors", async () => {
    const reg = new SearchRegistry();
    reg.registerProvider("solicitacao", () => {
      throw new Error("boom");
    });
    const list = await reg.collect();
    expect(list).toEqual([]);
  });
});

describe("rank", () => {
  const items = [
    { id: "kanban", title: "Kanban", keywords: ["board", "sprint"], category: "Trabalho" },
    { id: "dash", title: "Dashboard", description: "resumo", category: "Trabalho" },
    { id: "diag", title: "Diagrama", keywords: ["mapa"], category: "IA" },
  ];

  it("prioritizes exact title matches", () => {
    const r = rank(items, "Kanban");
    expect(r[0].item.id).toBe("kanban");
    expect(r[0].reasons).toContain("título exato");
  });

  it("matches by keyword", () => {
    const r = rank(items, "sprint");
    expect(r[0].item.id).toBe("kanban");
    expect(r[0].reasons).toContain("keyword");
  });

  it("matches by description", () => {
    const r = rank(items, "resumo");
    expect(r[0].item.id).toBe("dash");
  });

  it("returns empty when no query and no recents", () => {
    const r = rank(items, "");
    // sem query, sem recents: todos zerados, ordem estável
    expect(r).toHaveLength(3);
    expect(r.every((x) => x.score === 0)).toBe(true);
  });

  it("boosts recent ids", () => {
    const r = rank(items, "", { recentIds: ["diag"] });
    expect(r[0].item.id).toBe("diag");
  });

  it("is diacritics-insensitive", () => {
    const r = rank(items, "diagrama");
    expect(r[0].item.id).toBe("diag");
  });
});

describe("hotkeys", () => {
  it("parses and formats", () => {
    const p = parseHotkey("mod+shift+k");
    expect(p).toEqual({ key: "k", mod: true, shift: true, alt: false });
    expect(formatHotkey("mod+k")).toMatch(/K$/);
  });

  it("matches keyboard events", () => {
    const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true });
    expect(matchesEvent("mod+k", ev)).toBe(true);
    const ev2 = new KeyboardEvent("keydown", { key: "k" });
    expect(matchesEvent("mod+k", ev2)).toBe(false);
  });

  it("does not match when extra modifiers pressed", () => {
    const ev = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, shiftKey: true });
    expect(matchesEvent("mod+k", ev)).toBe(false);
  });
});
