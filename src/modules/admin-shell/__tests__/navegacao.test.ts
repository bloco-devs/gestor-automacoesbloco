import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ADMIN_GROUPS, ADMIN_NAV } from "../navigation/registry";

const app = readFileSync("src/App.tsx", "utf8");
const rotasDeclaradas = new Set([...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]));

describe("menu do Admin", () => {
  it("todo item leva a uma rota que existe", () => {
    for (const item of ADMIN_NAV) {
      if (item.external) continue;
      const rota = item.href.split("#")[0].split("?")[0];
      expect(rotasDeclaradas.has(rota), `${item.id} → ${rota}`).toBe(true);
    }
  });

  it("nenhum destino aparece duas vezes", () => {
    // "Debug" e "Observabilidade IA" iam para o mesmo lugar; "Logs & Auditoria"
    // levava ao board de demandas. Dois cliques para o mesmo destino é ruído.
    const porHref = new Map<string, string[]>();
    for (const item of ADMIN_NAV) {
      if (!porHref.has(item.href)) porHref.set(item.href, []);
      porHref.get(item.href)!.push(item.id);
    }
    const repetidos = [...porHref].filter(([, ids]) => ids.length > 1);
    expect(repetidos, JSON.stringify(repetidos)).toHaveLength(0);
  });

  it("todo item pertence a um grupo declarado", () => {
    const grupos = new Set(ADMIN_GROUPS.map((g) => g.id));
    for (const item of ADMIN_NAV) expect(grupos.has(item.group), item.id).toBe(true);
  });

  it("as telas de catálogo estático saíram do menu", () => {
    // Ficaram um tempo etiquetadas como "Governança (documentos)". Ninguém as
    // usava, e quinze itens que não leem o banco pesavam mais que informavam.
    const fora = [
      "/admin/quality", "/admin/platform", "/admin/errors", "/admin/performance",
      "/admin/release", "/admin/feature-flags", "/admin/settings", "/admin/secrets",
      "/admin/security", "/admin/security/compliance", "/admin/security/permissions",
      "/admin/security/policies", "/admin/security/integrity", "/admin/security/timeline",
      "/admin/security/reports",
    ];
    for (const href of fora) {
      expect(ADMIN_NAV.some((i) => i.href === href), href).toBe(false);
      expect(rotasDeclaradas.has(href), href).toBe(false);
    }
  });

  it("o menu inteiro cabe em vinte itens", () => {
    expect(ADMIN_NAV.length).toBeLessThanOrEqual(20);
  });

  it("Platform Health e Security Center continuam vivos dentro das abas do gestor", () => {
    // As duas saíram do menu mas seguem embutidas em Manager Insights; apagar
    // os arquivos quebraria aquela tela.
    const insights = readFileSync("src/modules/manager-unified/InsightsTabs.tsx", "utf8");
    expect(insights).toContain("@/pages/admin/PlatformHealth");
    expect(insights).toContain("@/pages/admin/SecurityCenter");
    expect(insights).toContain("@/modules/governance/GovernancePage");
  });

  it("as telas que não podiam ter conteúdo saíram do menu e do código", () => {
    for (const morta of ["/admin/backup", "/admin/security/threats", "/admin/audit"]) {
      expect(ADMIN_NAV.some((i) => i.href === morta), morta).toBe(false);
      expect(rotasDeclaradas.has(morta), morta).toBe(false);
    }
  });
});
