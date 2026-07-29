import { describe, it, expect } from "vitest";
import { tomDaEtapa } from "../services/tomDaEtapa";

describe("tomDaEtapa", () => {
  it("reconhece as etapas de trabalho em curso", () => {
    for (const r of ["Em andamento", "Em Desenvolvimento", "Doing", "Em execução"]) {
      expect(tomDaEtapa(r)).toBe("andamento");
    }
  });

  it("reconhece as etapas de espera e conferência", () => {
    for (const r of ["Em revisão", "Teste Técnico", "Documentos", "Triagem", "Aguardando cliente"]) {
      expect(tomDaEtapa(r)).toBe("revisao");
    }
  });

  it("reconhece as etapas terminadas", () => {
    for (const r of ["Concluído", "Feito", "Done", "Aprovação", "Entregue"]) {
      expect(tomDaEtapa(r)).toBe("concluido");
    }
  });

  it("reconhece as etapas travadas", () => {
    for (const r of ["Bloqueado", "Reprovado", "Cancelado", "Impedido"]) {
      expect(tomDaEtapa(r)).toBe("bloqueado");
    }
  });

  it("não pinta de verde o que está apenas esperando aprovação", () => {
    // "Aguardando aprovação" contém "aprova". Quem aguarda não terminou —
    // e errar para "ainda não acabou" é mais seguro que o contrário.
    expect(tomDaEtapa("Aguardando aprovação")).toBe("revisao");
    expect(tomDaEtapa("Pendente de aprovação")).toBe("revisao");
  });

  it("ignora acento e caixa", () => {
    expect(tomDaEtapa("EM REVISÃO")).toBe("revisao");
    expect(tomDaEtapa("em revisao")).toBe("revisao");
    expect(tomDaEtapa("Em Revisão")).toBe("revisao");
  });

  it("devolve neutro quando o nome não diz nada", () => {
    // Sem palpite colorido: etapa comum lê como etapa comum. Uma cor
    // inventada seria interpretada como informação pelo olho.
    for (const r of ["Backlog", "Ideias", "Sprint 4", "Coluna 1", ""]) {
      expect(tomDaEtapa(r)).toBe("neutro");
    }
  });

  it("não quebra com espaço em volta", () => {
    expect(tomDaEtapa("  Concluído  ")).toBe("concluido");
  });
});
