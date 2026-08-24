import { describe, expect, it } from "vitest";
import { formatarReferenciaComSigla, siglaDoSistema } from "../services/siglaDoSistema";

describe("siglaDoSistema — Resolução de Códigos e Siglas do Sistema", () => {
  it("deduz a sigla oficial para Recursos Humanos (RH)", () => {
    expect(siglaDoSistema("Recursos Humanos")).toBe("RH");
    expect(siglaDoSistema("Gestão de Pessoas / RH")).toBe("RH");
    expect(siglaDoSistema("Folha de Pagamento")).toBe("RH");
  });

  it("deduz a sigla para Sienge, Financeiro, Obras e TI", () => {
    expect(siglaDoSistema("Sienge Plataforma")).toBe("SIENGE");
    expect(siglaDoSistema("Financeiro e Faturamento")).toBe("FIN");
    expect(siglaDoSistema("Gestão de Obras / SGPO")).toBe("GO");
    expect(siglaDoSistema("Infraestrutura e Redes")).toBe("IN");
    expect(siglaDoSistema("Tecnologia da Informação")).toBe("TI");
  });

  it("substitui o código genérico REC pelo código da sigla real", () => {
    expect(formatarReferenciaComSigla("REC-2608-0001", "Recursos Humanos", "id-123")).toBe("RH-2608-0001");
    expect(formatarReferenciaComSigla("REC-2608-0002", "Sienge", "id-456")).toBe("SIENGE-2608-0002");
    expect(formatarReferenciaComSigla("REC-2608-0003", "Financeiro", "id-789")).toBe("FIN-2608-0003");
  });

  it("extrai sigla do título quando fornecido entre colchetes", () => {
    expect(formatarReferenciaComSigla("#hash12", null, "id-999", "[GO-11] Corrigir relatório de obra")).toBe("GO-ID999");
  });
});
