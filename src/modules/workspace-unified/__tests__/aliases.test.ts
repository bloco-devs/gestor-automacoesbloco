import { describe, it, expect } from "vitest";
import { listAliases, getNavigation } from "@/modules/navigation/registry";

describe("Workspace navigation (FEATURE 026.3)", () => {
  const ws = getNavigation("workspace");

  it("home do Workspace é /workspace", () => {
    expect(ws.home).toBe("/workspace");
  });

  it("expõe exatamente Hoje, Demandas, Builder, DevTools e Inbox", () => {
    const labels = ws.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(["Hoje", "Demandas", "Builder", "DevTools", "Inbox"]);
  });

  it("/atividades vira alias para /workspace/demandas", () => {
    const aliases = listAliases();
    const hit = aliases.find((a) => a.from === "/atividades");
    expect(hit?.to).toBe("/workspace/demandas");
  });

  it("/admin/workflows e /studio viram aliases para /workspace/builder", () => {
    const aliases = listAliases();
    const wf = aliases.find((a) => a.from === "/admin/workflows");
    const st = aliases.find((a) => a.from === "/studio");
    expect(wf?.to).toBe("/workspace/builder");
    expect(st?.to).toBe("/workspace/builder");
  });

  it("/developer vira alias para /workspace/devtools", () => {
    const aliases = listAliases();
    const hit = aliases.find((a) => a.from === "/developer");
    expect(hit?.to).toBe("/workspace/devtools");
  });
});
