import { describe, it, expect } from "vitest";
import { listAliases, getNavigation } from "@/modules/navigation/registry";
import { INSIGHTS_TAB_IDS } from "../InsightsTabs";

describe("Gestão navigation (FEATURE 026.4)", () => {
  const g = getNavigation("gestao");

  it("home da Gestão é /gestao/panorama", () => {
    expect(g.home).toBe("/gestao/panorama");
  });

  it("expõe exatamente Panorama, Equipe, Demandas, Insights e Inbox", () => {
    const labels = g.groups.flatMap((gr) => gr.items.map((i) => i.label));
    expect(labels).toEqual(["Panorama", "Equipe", "Demandas", "Insights", "Inbox"]);
  });

  it("/command-center e /operacoes viram aliases para /gestao/panorama", () => {
    const aliases = listAliases();
    expect(aliases.find((a) => a.from === "/command-center")?.to).toBe("/gestao/panorama");
    expect(aliases.find((a) => a.from === "/operacoes")?.to).toBe("/gestao/panorama");
  });

  it("Analytics/Saúde/Observability/Quality/PlatformHealth viram aliases para /gestao/insights", () => {
    const aliases = listAliases();
    const to = "/gestao/insights";
    for (const from of ["/admin/analytics", "/admin/saude", "/admin/observability", "/admin/quality", "/admin/platform-health"]) {
      expect(aliases.find((a) => a.from === from)?.to).toBe(to);
    }
  });

  it("InsightsTabs contém as 7 abas unificadas", () => {
    expect(INSIGHTS_TAB_IDS).toEqual([
      "resumo",
      "operacao",
      "ia",
      "qualidade",
      "observabilidade",
      "plataforma",
      "seguranca",
    ]);
  });
});
