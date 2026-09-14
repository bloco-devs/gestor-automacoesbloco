import { describe, it, expect } from "vitest";
import { listAliases, getNavigation } from "@/modules/navigation/registry";

describe("Workspace navigation (FEATURE 026.3)", () => {
  const ws = getNavigation("workspace");

  it("home do Workspace é /workspace", () => {
    expect(ws.home).toBe("/workspace");
  });

  it("expõe exatamente Hoje, Demandas, Projetos, Builder e DevTools", () => {
    // "Inbox" continua fora do menu, e o motivo agora é verificado: ele lista
    // `solicitacoes`, a tabela do fluxo antigo, e não `demands`. Como atalho
    // para "ver o que chegou" ele mostraria outra coisa. A rota
    // /trabalho/inbox continua existindo e alcançável pela busca (⌘K).
    const labels = ws.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(["Hoje", "Demandas", "Projetos", "Builder", "DevTools"]);
  });

  /*
   * O DEFEITO QUE ESTE TESTE TRANCA
   *
   * Havia um item só, chamado "Demandas", apontando para /workspace/demandas —
   * que é a tela de PROJETOS (os quadros). Quem procurava as demandas
   * recebidas clicava nele, via uma lista de quadros e concluía que a caixa
   * de entrada tinha sumido.
   *
   * São tabelas diferentes: `demands` guarda o que a conversa com o Blink
   * criou; `atividades_boards`, os quadros. Um rótulo só não tinha como estar
   * certo para as duas.
   */
  it("Demandas e Projetos são destinos diferentes, e o rótulo casa com a tela", () => {
    const itens = ws.groups.flatMap((g) => g.items);
    const demandas = itens.find((i) => i.label === "Demandas");
    const projetos = itens.find((i) => i.label === "Projetos");
    expect(demandas?.route).toBe("/admin/demandas");
    expect(projetos?.route).toBe("/workspace/demandas");
    expect(demandas?.route).not.toBe(projetos?.route);
  });

  it("quem digita o caminho do board de demandas cai em Demandas, não em Projetos", () => {
    const aliases = listAliases();
    expect(aliases.find((a) => a.from === "/board-demandas")?.to).toBe("/admin/demandas");
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
