import { describe, expect, it } from "vitest";
import { getNavigation, listAliases } from "@/modules/navigation";

describe("Portal Unificado — navegação", () => {
  it("perfil portal tem exatamente 4 itens (Início, Minhas Demandas, Conhecimento, Inbox)", () => {
    const schema = getNavigation("portal");
    const items = schema.groups.flatMap((g) => g.items);
    expect(items.map((i) => i.label)).toEqual([
      "Início",
      "Minhas Demandas",
      "Conhecimento",
      "Inbox",
    ]);
  });

  it("mantém aliases legados apontando para as rotas canônicas do Portal", () => {
    const aliases = listAliases().filter((a) => a.profile === "portal");
    const to = (from: string) => aliases.find((a) => a.from === from)?.to;
    expect(to("/portal")).toBe("/portal/inicio");
    expect(to("/minhas-solicitacoes")).toBe("/portal/demandas");
    expect(to("/portal/central")).toBe("/portal/conhecimento");
    expect(to("/trabalho/inbox")).toBe("/portal/inbox");
  });
});
