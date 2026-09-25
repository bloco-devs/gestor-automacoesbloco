import { describe, expect, it } from "vitest";
import { STATUS_META } from "@/domain/demand/mappers/fromDemands";
import {
  classificarResposta,
  esperaAntesDaTentativa,
  montarMensagem,
  nomeParaSaudacao,
  truncar,
  FRASE_AVANCO,
  FRASE_VOLTA,
  LIMITE_RESOLUCAO,
  ORDEM_COLUNA,
  ROTULO_COLUNA,
  type Evento,
} from "../../../../supabase/functions/_shared/whatsapp";

const opts = { link: "https://app/demandas/x", appUrl: "https://app" };
const base = { ticket_code: "OBRA-2609-0012", titulo: "Mapa interativo", nome: "Carla" };
const mover = (status: string, status_antes: string, responsavel: string | null = "Nielson") =>
  montarMensagem("coluna_mudou", { ...base, status, status_antes, responsavel }, opts);

/**
 * A edge function roda em Deno e não alcança src/, então carrega cópias do
 * quadro. Estes testes impedem as cópias de envelhecer: renomear uma coluna,
 * ou mudar a ordem delas, tem que quebrar aqui — a ordem é o que decide se o
 * Blink diz "assumiu" ou "voltou para um ajuste".
 */
describe("o WhatsApp conhece o quadro como ele é", () => {
  it("ROTULO_COLUNA espelha os nomes de STATUS_META", () => {
    const doQuadro = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.rotulo]));
    expect(ROTULO_COLUNA).toEqual(doQuadro);
  });

  it("ORDEM_COLUNA espelha a ordem de STATUS_META", () => {
    const doQuadro = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.ordem]));
    expect(ORDEM_COLUNA).toEqual(doQuadro);
  });

  it("toda coluna, menos a conclusão, tem frase de avanço e de volta", () => {
    const semConcluido = Object.keys(STATUS_META).filter((s) => s !== "concluido").sort();
    expect(Object.keys(FRASE_AVANCO).sort()).toEqual(semConcluido);
    expect(Object.keys(FRASE_VOLTA).sort()).toEqual(semConcluido);
  });
});

describe("o Blink acompanha com gentileza", () => {
  it("o recibo se apresenta e tranquiliza sobre o acompanhamento", () => {
    const m = montarMensagem("demanda_criada", { ...base, status: "backlog" }, opts);
    expect(m).toContain("Oi, Carla! 😊");
    expect(m).toContain("Aqui é o Blink");
    expect(m).toContain("*OBRA-2609-0012* — Mapa interativo");
    expect(m).toContain("Vou te acompanhar por aqui: a cada passo que ela der, eu te conto");
  });

  it("toda mensagem cumprimenta pelo nome", () => {
    for (const ev of ["demanda_criada", "coluna_mudou", "demanda_concluida"] as Evento[]) {
      expect(montarMensagem(ev, { ...base, status: "a_fazer" }, opts)).toContain("Oi, Carla!");
    }
  });

  it("diz QUEM assumiu, pelo nome", () => {
    const m = mover("em_desenvolvimento", "a_fazer");
    expect(m).toContain("Nielson assumiu sua solicitação e já está trabalhando nela");
    expect(m).toContain("Etapa atual: *Em desenvolvimento*");
  });

  it("sem responsável, fala da equipe sem inventar nome", () => {
    const m = mover("em_desenvolvimento", "a_fazer", null);
    expect(m).toContain("Uma pessoa da equipe assumiu");
    expect(m).not.toContain("null");
  });

  it("VOLTAR não é assumir: testes → desenvolvimento é um ajuste", () => {
    const m = mover("em_desenvolvimento", "em_testes");
    expect(m).toContain("Nielson encontrou um ajuste para fazer");
    expect(m).not.toContain("assumiu");
  });

  it("voltar para a fila de análise é dito com calma", () => {
    const m = mover("backlog", "a_fazer");
    expect(m).toContain("voltou para a fila de análise");
    expect(m).toContain("eu te conto");
  });

  it("homologação comemora e é a única que pede ação", () => {
    const m = mover("homologacao", "em_testes");
    expect(m).toContain("Ficou pronta! 🎉");
    expect(m).toContain("só falta você");
    expect(m).toContain("Validar agora: https://app/demandas/x");
    expect(mover("a_fazer", "backlog")).not.toContain("Validar agora");
  });

  it("a conclusão conta o que foi feito, quem cuidou, e agradece", () => {
    const m = montarMensagem(
      "demanda_concluida",
      { ...base, status: "concluido", responsavel: "Nielson" },
      { ...opts, resolucao: "Criado o mapa por pavimento." },
    );
    expect(m).toContain("Prontinho — sua solicitação foi concluída! ✅");
    expect(m).toContain("*O que foi feito:*\nCriado o mapa por pavimento.");
    expect(m).toContain("Quem cuidou dela foi Nielson.");
    expect(m).toContain("Obrigado pela paciência!");
  });

  it("sem relato, a conclusão não inventa resumo", () => {
    const m = montarMensagem("demanda_concluida", { ...base, status: "concluido" }, { ...opts, resolucao: null });
    expect(m).toContain("foi concluída");
    expect(m).not.toContain("O que foi feito");
    expect(m).toContain("O registro do que foi feito fica aqui");
  });

  /**
   * O sistema não sabe o gênero de ninguém. "O Nielson assumiu" ou "fique
   * tranquila" numa mensagem pessoal, errados, soam piores do que a frase
   * neutra. Esta varredura passa por TODAS as combinações de etapa.
   */
  it("nenhuma frase usa artigo antes do nome nem adjetivo de gênero", () => {
    const status = Object.keys(ROTULO_COLUNA);
    const textos: string[] = [];
    for (const para of status) for (const de of status) if (para !== de) textos.push(mover(para, de));
    textos.push(montarMensagem("demanda_concluida", { ...base, responsavel: "Nielson" }, { ...opts, resolucao: "x" }));
    textos.push(montarMensagem("demanda_criada", base, opts));
    for (const m of textos) {
      expect(m).not.toMatch(/\b[oa] Nielson\b/i);
      expect(m).not.toMatch(/\b(tranquil[oa]|bem-vind[oa]|preocupad[oa]|obrigada)\b/i);
    }
  });

  it("o descadastro vai na primeira e na última mensagem, não nas do meio", () => {
    const tem = (ev: Evento) => montarMensagem(ev, { ...base, status: "a_fazer" }, opts).includes("https://app/preferencias");
    expect(tem("demanda_criada")).toBe(true);
    expect(tem("demanda_concluida")).toBe(true);
    expect(tem("coluna_mudou")).toBe(false);
  });

  it("mudança de coluna leva um link só", () => {
    const m = mover("em_desenvolvimento", "a_fazer");
    expect(m.match(/https:\/\//g)?.length).toBe(1);
  });

  it("sem código, sem título e sem nome ainda sai uma mensagem legível", () => {
    const m = montarMensagem("coluna_mudou", { status: "a_fazer" }, opts);
    expect(m).toContain("Oi! 😊");
    expect(m).toContain("*sua solicitação*");
    expect(m).not.toContain("undefined");
    expect(m).not.toContain("null");
  });
});

/**
 * A primeira mensagem de verdade chegou como "Oi, Tecnologiabloco!": o nome
 * vinha de um e-mail de setor. Estes casos travam o conserto — e, igualmente
 * importante, travam que ele não apague nome de gente.
 */
describe("nomeParaSaudacao — cumprimenta gente, não setor", () => {
  it.each([
    ["Tecnologiabloco", null],
    ["tecnologiabloco", null],
    ["Financeiro", null],
    ["Rh", null],
    ["TI", null],
    ["Atendimento Nakhon", null],
    ["contato2", null],
    ["fulano@grupobloco.com.br", null],
    ["", null],
    [null, null],
  ])("%s → sem nome", (entrada, esperado) => {
    expect(nomeParaSaudacao(entrada)).toBe(esperado);
  });

  it.each([
    ["Thaísa", "Thaísa"],
    ["thaisa", "Thaisa"],
    ["João Silva", "João"],
    ["joao.silva", "Joao"],
    // "ti" é setor só como nome inteiro. Por substring, estes três sumiriam.
    ["Tiago", "Tiago"],
    ["Tatiana", "Tatiana"],
    ["Cristina", "Cristina"],
  ])("%s → %s", (entrada, esperado) => {
    expect(nomeParaSaudacao(entrada)).toBe(esperado);
  });

  it("mensagem para conta de setor cumprimenta sem nome", () => {
    const m = montarMensagem("demanda_criada", { ...base, nome: "Tecnologiabloco" }, opts);
    expect(m.startsWith("Oi! 😊")).toBe(true);
    expect(m).not.toContain("Tecnologiabloco");
  });
});

describe("truncar", () => {
  it("não mexe no que já cabe", () => {
    expect(truncar("curto")).toBe("curto");
  });

  it("corta no fim de uma palavra e marca que cortou", () => {
    const longo = "palavra ".repeat(200);
    const t = truncar(longo);
    expect(t.length).toBeLessThanOrEqual(LIMITE_RESOLUCAO + 1);
    expect(t.endsWith("…")).toBe(true);
    expect(t.slice(0, -1).endsWith("palavra")).toBe(true);
  });
});

/**
 * O coração da regra "nunca mandar duas vezes". Cada linha aqui é uma linha
 * da tabela de erros da documentação da Uazapi.
 */
describe("classificarResposta", () => {
  it.each([
    [200, "enviado"],
    [201, "enviado"],
    [400, "falhou"],
    [422, "falhou"],
    [401, "configuracao"],
    [403, "configuracao"],
    [404, "configuracao"],
    [409, "incerto"],
    [429, "repetir"],
    [500, "repetir"],
    [503, "repetir"],
    ["timeout", "incerto"],
    ["rede", "incerto"],
  ] as const)("%s → %s", (status, esperado) => {
    expect(classificarResposta(status)).toBe(esperado);
  });

  it("timeout NUNCA vira repetição automática", () => {
    // É o caso da documentação: o primeiro request pode ter sido processado.
    expect(classificarResposta("timeout")).not.toBe("repetir");
  });
});

describe("esperaAntesDaTentativa", () => {
  it("sobe em degraus de 1, 5 e 15 minutos", () => {
    expect(esperaAntesDaTentativa(1)).toBe(60_000);
    expect(esperaAntesDaTentativa(2)).toBe(300_000);
    expect(esperaAntesDaTentativa(3)).toBe(900_000);
    expect(esperaAntesDaTentativa(9)).toBe(900_000);
  });

  it("respeita o Retry-After quando ele pede mais", () => {
    expect(esperaAntesDaTentativa(1, 600)).toBe(600_000);
    expect(esperaAntesDaTentativa(3, 10)).toBe(900_000);
  });
});
