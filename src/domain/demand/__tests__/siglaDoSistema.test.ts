import { describe, expect, it } from "vitest";
import { formatarReferenciaComSigla, siglaDoSistema } from "../services/siglaDoSistema";

describe("siglaDoSistema — Catálogo Completo dos 16 Sistemas do HUB Bloco ID", () => {
  it("deduz as siglas oficiais para os 16 sistemas do HUB Bloco ID", () => {
    expect(siglaDoSistema("crm-house")).toBe("CRM");
    expect(siglaDoSistema("desenvolvimento-produto")).toBe("PROD");
    expect(siglaDoSistema("nakhon-contratos")).toBe("CONT");
    expect(siglaDoSistema("gestao-comercial")).toBe("COM");
    expect(siglaDoSistema("captacao")).toBe("CAP");
    expect(siglaDoSistema("incorporacao")).toBe("INC");
    expect(siglaDoSistema("produtividade")).toBe("OBRA");
    expect(siglaDoSistema("processos")).toBe("SGPO");
    expect(siglaDoSistema("rh")).toBe("RH");
    expect(siglaDoSistema("locacao")).toBe("SUPR");
    expect(siglaDoSistema("fluxo-caixa")).toBe("FIN");
    expect(siglaDoSistema("atividades")).toBe("ATIV");
    expect(siglaDoSistema("automacoes")).toBe("AUTO");
    expect(siglaDoSistema("portfolio")).toBe("PORT");
    expect(siglaDoSistema("sucesso-cliente")).toBe("CS");
    expect(siglaDoSistema("viab")).toBe("VIAB");
  });

  it("substitui o prefixo genérico REC pelas siglas reais dos sistemas", () => {
    expect(formatarReferenciaComSigla("REC-2608-0001", "rh", "id1")).toBe("RH-2608-0001");
    expect(formatarReferenciaComSigla("REC-2608-0002", "fluxo-caixa", "id2")).toBe("FIN-2608-0002");
    expect(formatarReferenciaComSigla("REC-2608-0003", "crm-house", "id3")).toBe("CRM-2608-0003");
    expect(formatarReferenciaComSigla("REC-2608-0004", "incorporacao", "id4")).toBe("INC-2608-0004");
  });
});
