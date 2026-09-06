import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync("src/App.tsx", "utf8");
const nav = readFileSync("src/components/sidebar/navGroups.ts", "utf8");
const registry = readFileSync("src/modules/admin-shell/navigation/registry.ts", "utf8");
const diagrama = readFileSync("src/pages/Diagrama.tsx", "utf8");

describe("ligação do Escritório no sistema", () => {
  it("tem rota própria e protegida", () => {
    expect(app).toContain('path="/escritorio"');
    expect(app).toMatch(/path="\/escritorio"[^\n]*ProtectedRoute/);
  });

  it("aparece no menu lateral e no AdminHub", () => {
    expect(nav).toContain('to: "/escritorio"');
    expect(registry).toContain('href: "/escritorio"');
  });

  it("não encosta no diagrama existente — ele continua na mesma rota", () => {
    expect(app).toContain('path="/diagrama"');
    expect(diagrama).toContain("computeEcossistemaLayout");
    expect(diagrama).not.toContain("escritorio");
  });

  it("a tela só lê: nada de insert, update ou delete", () => {
    for (const arquivo of [
      "src/pages/Escritorio.tsx",
      "src/modules/escritorio/dados.ts",
      "src/modules/escritorio/motor.ts",
    ]) {
      const fonte = readFileSync(arquivo, "utf8");
      expect(fonte).not.toMatch(/\.(insert|update|delete|upsert)\(/);
    }
  });
});
