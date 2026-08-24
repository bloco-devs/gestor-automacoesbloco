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

  it("substitui os prefixos genéricos REQ- e REC- pelas siglas reais dos sistemas", () => {
    expect(formatarReferenciaComSigla("REQ-2608-0033", null, "id1", "Ajuste e integração do Fluxo Futuro Financeiro")).toBe("FIN-2608-0033");
    expect(formatarReferenciaComSigla("REQ-2608-0053", null, "id2", "Tela de quantitativo não atualiza automaticamente")).toBe("OBRA-2608-0053");
    expect(formatarReferenciaComSigla("REQ-2608-0047", null, "id3", "Erro ao editar nome no portfólio")).toBe("PORT-2608-0047");
    expect(formatarReferenciaComSigla("REQ-2608-0008", null, "id4", "Flexibilização do fluxo de pagamento Nakhon")).toBe("CONT-2608-0008");
    expect(formatarReferenciaComSigla("REC-2608-0001", "rh", "id5")).toBe("RH-2608-0001");
  });
});
