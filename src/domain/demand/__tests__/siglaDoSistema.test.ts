import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

/*
 * O DESTINO "TECNOLOGIA", E POR QUE ELE PRECISA DE TESTE
 *
 * O caso real que o originou, de 14/09/2026:
 *
 *   "Solicitada a tabela nova de leads do site, que sejam da campanha de
 *    google e site direto"
 *
 * Sem destino, ela nascia com `sistema_slug` nulo e a tela adivinhava o código
 * pelo título: a palavra "leads" está na lista da Captação, então uma demanda
 * de n8n aparecia como CAP- e, ao lado, como "não identificado".
 *
 * O que estes testes trancam são as duas metades do acerto: que o destino
 * existe de verdade (código e nome próprios) e que ele NÃO rouba demanda de
 * sistema — ele é a última opção, não um atalho.
 */
describe("Tecnologia: a gaveta de quem não é de nenhum sistema", () => {
  const PEDIDO_REAL =
    "Solicitada a tabela nova de leads do site, que sejam da campanha de google e site direto";

  it("tem código e nome próprios, como qualquer destino", () => {
    expect(siglaDoSistema("tecnologia")).toBe("TEC");
    expect(nomeDoSistemaPeloSlug("tecnologia")).toBe("Tecnologia");
  });

  it("o pedido real deixa de pegar emprestado o código da Captação", () => {
    // Antes: sem slug, "leads" levava a demanda para CAP.
    expect(siglaDoSistema(null, PEDIDO_REAL)).toBe("CAP");
    // Agora, registrada como Tecnologia, o slug vence o palpite do título.
    expect(formatarReferenciaComSigla("REQ-2609-0012", "tecnologia", "id", PEDIDO_REAL)).toBe(
      "TEC-2609-0012",
    );
  });

  it("nunca vence um sistema de verdade, mesmo com palavra de tecnologia no título", () => {
    // A regra que o André pediu: só vale quando NENHUM sistema reconhece.
    const titulo = "Integrar o n8n para puxar os dados";
    expect(siglaDoSistema("produtividade", titulo)).toBe("OBRA");
    expect(siglaDoSistema("rh", titulo)).toBe("RH");
    expect(siglaDoSistema("fluxo-caixa", titulo)).toBe("FIN");
  });

  it("não inventa Tecnologia para quem não a escolheu", () => {
    // Demanda antiga, sem slug: continua como estava. O destino não é um
    // fallback silencioso — alguém, pessoa ou triagem, tem de tê-lo escolhido.
    expect(siglaDoSistema(null, "Erro ao salvar contrato")).not.toBe("TEC");
  });

  it("um código já emitido não é reescrito para TEC", () => {
    // Código é referência que as pessoas citam. Só prefixo genérico é trocado.
    expect(formatarReferenciaComSigla("RH-2607-0001", "tecnologia", "id", PEDIDO_REAL)).toBe(
      "RH-2607-0001",
    );
  });
});

describe("Tecnologia não é um sistema, e o Escritório não pode vê-la", () => {
  it("fica fora do catálogo do HUB", async () => {
    const { SISTEMAS_SEED } = await import("@/lib/ecossistemaSeed");
    const { SLUGS_FORA_DO_ECOSSISTEMA } = await import(
      "../services/destinosForaDoEcossistema"
    );
    // O seed é o espelho do HUB, e é dele que o andar tira mesa, monitor e
    // porta. Um destino local ali dentro viraria um sistema desenhado na tela.
    for (const s of SISTEMAS_SEED) {
      expect(SLUGS_FORA_DO_ECOSSISTEMA.has(s.id), `${s.id} vazou para o seed`).toBe(false);
    }
  });

  it("entra por último na lista, que é onde se considera o resto", async () => {
    const { comDestinosFora } = await import("../services/destinosForaDoEcossistema");
    const lista = comDestinosFora([
      { id: "rh", nome: "Gestão de RH" },
      { id: "produtividade", nome: "Gestão de Obra" },
    ]);
    expect(lista.map((s) => s.id)).toEqual(["rh", "produtividade", "tecnologia"]);
  });

  it("não duplica se algum dia o HUB passar a declarar o mesmo slug", async () => {
    const { comDestinosFora } = await import("../services/destinosForaDoEcossistema");
    const lista = comDestinosFora([{ id: "tecnologia", nome: "Tecnologia (do HUB)" }]);
    expect(lista).toHaveLength(1);
    expect(lista[0].nome).toBe("Tecnologia (do HUB)");
  });
});

/*
 * O MAPA DO BANCO E O CATALOGO DO FRONT TEM DE DIZER A MESMA COISA
 *
 * Duas regras decidiam o codigo do chamado e nunca se falaram: o banco casava
 * por familia de palavras (%obra%, %financ%) e o front por catalogo de slug.
 * Como os slugs sao nomes internos — `locacao`, `fluxo-caixa`,
 * `produtividade` —, quase nenhum casava, e 81 das 95 demandas nasceram com o
 * prefixo generico `REQ` mesmo tendo sistema gravado ao lado. A tela
 * disfarcava, reescrevendo o prefixo na exibicao.
 *
 * A migration passou o banco para mapa exato. Este teste existe para os dois
 * mapas nao divergirem de novo: ele LE o SQL e compara com o catalogo daqui.
 */
describe("o prefixo do banco combina com a sigla do front", () => {
  /** A migration mais recente que define `demand_prefixo_slug`. */
  function mapaDoBanco(): Array<[string, string]> {
    const dir = join(process.cwd(), "supabase/migrations");
    const arquivo = readdirSync(dir)
      .filter((n) => n.endsWith(".sql"))
      .sort()
      .reverse()
      .find((n) => readFileSync(join(dir, n), "utf8").includes("FUNCTION public.demand_prefixo_slug"));
    if (!arquivo) throw new Error("migration de demand_prefixo_slug nao encontrada");
    const sql = readFileSync(join(dir, arquivo), "utf8");
    return [...sql.matchAll(/WHEN\s+'([a-z0-9-]+)'\s+THEN\s+'([A-Z]+)'/g)].map(
      (m) => [m[1], m[2]] as [string, string],
    );
  }

  /*
   * As duas divergencias DELIBERADAS, e o motivo de cada uma.
   *
   * Sao os prefixos que as demandas desses sistemas ja carregam e que ja
   * circulam citados. O catalogo daqui os chama de SGPO e AUTO, mas essa sigla
   * so serve para a COR do cracha: codigo com prefixo real nunca e reescrito
   * na exibicao. Alinhar por alinhar quebraria citacao viva.
   */
  const PREFIXO_HISTORICO: Record<string, string> = {
    processos: "GP",
    automacoes: "AUT",
  };

  const mapa = mapaDoBanco();

  it("o SQL foi lido e tem os sistemas do ecossistema", () => {
    expect(mapa.length).toBeGreaterThanOrEqual(16);
  });

  it("cada slug do banco devolve a sigla que o front usaria", () => {
    const divergentes = mapa
      .map(([slug, siglaSql]) => {
        const esperada = PREFIXO_HISTORICO[slug] ?? siglaDoSistema(slug);
        return siglaSql === esperada ? null : `${slug}: SQL=${siglaSql} front=${esperada}`;
      })
      .filter(Boolean);
    expect(divergentes).toEqual([]);
  });

  it("todo slug do banco tem nome proprio para o relatorio", () => {
    // Sem nome, a coluna Sistema mostra "nao identificado" para um sistema que
    // esta cadastrado — foi o caso do `viabilidade`.
    const semNome = mapa
      .map(([slug]) => slug)
      .filter((slug) => slug !== "tecnologia" && !nomeDoSistemaPeloSlug(slug));
    expect(semNome).toEqual([]);
  });
});
