import { describe, expect, it } from "vitest";
import {
  formatarReferenciaComSigla,
  nomeDoSistemaPeloSlug,
  siglaDoSistema,
} from "../services/siglaDoSistema";

/**
 * O DEFEITO QUE ESTES TESTES TRANCAM
 *
 * O Relatório de Implementações imprimia `sistema_slug` cru. A tela, o CSV e o
 * PDF mostravam "produtividade" na coluna Sistema — e quem recebeu o relatório
 * respondeu, com razão, que "produtividade não existe em nossos sistemas". Não
 * existe mesmo: `produtividade` é a chave interna da Gestão de Obra.
 *
 * O nome sempre esteve em `SISTEMAS_ECOSSISTEMA_BLOCO_ID`, ao lado da sigla que
 * o cartão já usava. Faltava o caminho do slug até ele.
 */
describe("nomeDoSistemaPeloSlug — o nome que a empresa usa, não a chave do banco", () => {
  it("traduz os slugs internos para os nomes oficiais", () => {
    expect(nomeDoSistemaPeloSlug("produtividade")).toBe("Gestão de Obra");
    expect(nomeDoSistemaPeloSlug("incorporacao")).toBe("Gestão de Incorporação");
    expect(nomeDoSistemaPeloSlug("nakhon-contratos")).toBe("Gerador de Contratos Nakhon");
    expect(nomeDoSistemaPeloSlug("fluxo-caixa")).toBe("Gestão Financeira");
    expect(nomeDoSistemaPeloSlug("locacao")).toBe("Gestão de Suprimentos");
    expect(nomeDoSistemaPeloSlug("crm-house")).toBe("Bloco.CRM HOUSE");
  });

  it("nunca devolve o slug cru para um sistema do catálogo", () => {
    for (const slug of ["produtividade", "incorporacao", "processos", "locacao", "fluxo-caixa"]) {
      expect(nomeDoSistemaPeloSlug(slug)).not.toBe(slug);
    }
  });

  it("aceita o slug com espaço e maiúscula, como vem de fonte diferente", () => {
    expect(nomeDoSistemaPeloSlug("  Produtividade  ")).toBe("Gestão de Obra");
  });

  it("sem sistema nenhum devolve null, para a tela escrever 'não identificado'", () => {
    expect(nomeDoSistemaPeloSlug(null)).toBeNull();
    expect(nomeDoSistemaPeloSlug(undefined)).toBeNull();
    expect(nomeDoSistemaPeloSlug("")).toBeNull();
  });

  /**
   * NÃO INVENTA NOME, E ISSO É A REGRA — NÃO UMA LACUNA.
   *
   * Uma versão anterior transformava slug desconhecido em texto legível
   * (`sistema-novo-qualquer` → "Sistema Novo Qualquer"). Fica bonito e esconde
   * o que importa: que alguém gravou um slug que não está no catálogo. Devolvendo
   * nulo, a tela mostra o slug cru e o problema aparece.
   */
  it("slug fora do catálogo devolve null, para o cru aparecer e denunciar o cadastro", () => {
    expect(nomeDoSistemaPeloSlug("sistema-novo-qualquer")).toBeNull();
  });
});

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

  /**
   * OS CASOS QUE ESTAVAM ERRADOS EM PRODUÇÃO.
   *
   * A GP-2608-0010 — "Aviso de envio de documentos Autentic" — é ficha de EPI
   * na Gestão de Obra e aparecia como Gestão de Processo. Duas causas:
   * "autentic" estava na lista de palavras do SGPO, e as palavras-chave
   * rodavam ANTES da consulta pelo slug.
   */
  describe("o slug manda, e nome de ferramenta não vira sistema", () => {
    it("não deduz sistema a partir de Autentique, que é ferramenta de assinatura", () => {
      // Sem slug e sem outra pista, o nome do fornecedor não decide nada.
      expect(siglaDoSistema(null, "Aviso de envio de documentos Autentic")).toBeNull();
      expect(siglaDoSistema(null, "Enviar contrato pelo Autentique")).toBeNull();
    });

    it("o slug gravado vence a palavra que aparece no título", () => {
      // Era o bug: título com "autentic" sobrepunha o slug de Obra.
      expect(siglaDoSistema("produtividade", "Aviso de envio de documentos Autentic")).toBe("OBRA");
      // E vale para qualquer palavra: RH no título não muda o sistema de Obra.
      expect(siglaDoSistema("produtividade", "Ficha de EPI do colaborador")).toBe("OBRA");
      expect(siglaDoSistema("rh", "Relatório financeiro de admissões")).toBe("RH");
      expect(siglaDoSistema("incorporacao", "Contrato Nakhon da unidade")).toBe("INC");
    });

    it("a heurística só entra quando não há slug reconhecido", () => {
      expect(siglaDoSistema(null, "Ficha de EPI e itens locáveis")).toBe("SUPR");
      expect(siglaDoSistema(null, "Quantitativo do canteiro")).toBe("OBRA");
    });

    it("casa palavra inteira, não pedaço de palavra", () => {
      // "ti" dentro de "atividade" e "notificação" não pode virar TI.
      expect(siglaDoSistema(null, "Notificação de prazo vencido")).not.toBe("TI");
      // "epi" dentro de "equipe" não pode virar Suprimentos.
      expect(siglaDoSistema(null, "Cadastro de equipe do plantão")).not.toBe("SUPR");
      // Mas a palavra sozinha continua casando.
      expect(siglaDoSistema(null, "Suporte técnico de TI")).toBe("TI");
      expect(siglaDoSistema(null, "Entrega de EPI")).toBe("SUPR");
    });
  });
});
