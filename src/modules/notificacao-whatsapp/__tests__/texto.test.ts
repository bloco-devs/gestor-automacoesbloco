import { describe, expect, it } from "vitest";
import { STATUS_META } from "@/domain/demand/mappers/fromDemands";
import {
  classificarResposta,
  esperaAntesDaTentativa,
  montarMensagem,
  truncar,
  FRASE_COLUNA,
  LIMITE_RESOLUCAO,
  ROTULO_COLUNA,
} from "../../../../supabase/functions/_shared/whatsapp";

const opts = { link: "https://app/demandas/x", appUrl: "https://app" };
const base = { ticket_code: "OBRA-2609-0012", titulo: "Mapa interativo", nome: "Carla" };

/**
 * A edge function roda em Deno e não alcança src/, então carrega uma cópia
 * dos nomes das colunas. Este teste é o que impede a cópia de envelhecer: se
 * alguém renomear uma coluna no quadro, o WhatsApp não pode continuar
 * mandando o nome antigo para quem pediu.
 */
describe("os nomes das colunas no WhatsApp são os do quadro", () => {
  it("ROTULO_COLUNA espelha STATUS_META", () => {
    const doQuadro = Object.fromEntries(Object.entries(STATUS_META).map(([k, v]) => [k, v.rotulo]));
    expect(ROTULO_COLUNA).toEqual(doQuadro);
  });

  it("toda coluna, menos a conclusão, tem uma frase para o solicitante", () => {
    const semConcluido = Object.keys(STATUS_META).filter((s) => s !== "concluido").sort();
    expect(Object.keys(FRASE_COLUNA).sort()).toEqual(semConcluido);
  });
});

describe("montarMensagem", () => {
  it("o recibo se apresenta como Blink e explica o que vem depois", () => {
    const m = montarMensagem("demanda_criada", { ...base, status: "backlog" }, opts);
    expect(m).toContain("Oi, Carla!");
    expect(m).toContain("Blink");
    expect(m).toContain("*OBRA-2609-0012* — Mapa interativo");
    expect(m).toContain("cada vez que ela mudar de etapa");
  });

  it("mudança de coluna diz de onde saiu, para onde foi, e o que isso quer dizer", () => {
    const m = montarMensagem("coluna_mudou", { ...base, status: "em_testes", status_antes: "em_desenvolvimento" }, opts);
    expect(m).toContain("passou de _Em desenvolvimento_ para *Em testes*");
    expect(m).toContain(FRASE_COLUNA.em_testes);
  });

  it("homologação é a única que pede ação, e o link diz isso", () => {
    const m = montarMensagem("coluna_mudou", { ...base, status: "homologacao", status_antes: "em_testes" }, opts);
    expect(m).toContain("*Homologação*");
    expect(m).toContain("Validar agora: https://app/demandas/x");
    const outra = montarMensagem("coluna_mudou", { ...base, status: "a_fazer", status_antes: "backlog" }, opts);
    expect(outra).not.toContain("Validar agora");
  });

  it("a conclusão leva o que foi feito", () => {
    const m = montarMensagem("demanda_concluida", { ...base, status: "concluido" }, { ...opts, resolucao: "Criado o mapa por pavimento." });
    expect(m).toContain("✅");
    expect(m).toContain("*O que foi feito:*\nCriado o mapa por pavimento.");
  });

  it("sem relato, a conclusão não inventa resumo", () => {
    const m = montarMensagem("demanda_concluida", { ...base, status: "concluido" }, { ...opts, resolucao: null });
    expect(m).toContain("foi concluída");
    expect(m).not.toContain("O que foi feito");
  });

  it("toda mensagem ensina a parar de receber", () => {
    for (const ev of ["demanda_criada", "coluna_mudou", "demanda_concluida"] as const) {
      expect(montarMensagem(ev, { ...base, status: "a_fazer" }, opts)).toContain("https://app/preferencias");
    }
  });

  it("sem código e sem título ainda sai uma mensagem legível", () => {
    const m = montarMensagem("coluna_mudou", { status: "a_fazer" }, opts);
    expect(m).toContain("*sua solicitação*");
    expect(m).not.toContain("undefined");
    expect(m).not.toContain("null");
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
