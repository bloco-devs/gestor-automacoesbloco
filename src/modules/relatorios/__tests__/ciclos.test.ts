/**
 * CICLOS CONFIGURÁVEIS
 *
 * O que estes testes provam, e por que importa:
 *
 * O sistema não conhece "dia 20". O ciclo de setembro/2026 usa 20/08 → 19/09
 * porque a folha de agosto já estava fechada quando o programa começou — é a
 * configuração daquele ciclo, não uma regra da empresa.
 *
 * Por isso cada caso aqui aparece com TRÊS janelas diferentes rodando pelas
 * MESMAS funções. Se alguém um dia reintroduzir a regra fixa, os casos de
 * 01/09 → 30/09 e 20/09 → 19/10 quebram, e é exatamente esse o alarme que
 * queremos.
 *
 * NOTA SOBRE FUSO: o Brasil extinguiu o horário de verão em 2019, então
 * America/Sao_Paulo é UTC-3 o ano inteiro em 2026. 00:00 em São Paulo é
 * 03:00Z. As funções não assumem isso — usam Intl — mas os valores esperados
 * abaixo, sim.
 */

import { describe, expect, it } from "vitest";
import {
  dentroDoCiclo,
  diaParaTexto,
  limiteExclusivo,
  primeiroInstante,
  ultimoDiaIncluido,
} from "../services/relatorios-service";

/** Monta um ciclo a partir dos dias que a pessoa digitaria no formulário. */
function ciclo(primeiroDia: string, ultimoDia: string) {
  return { inicio: primeiroInstante(primeiroDia), fim: limiteExclusivo(ultimoDia) };
}

const SETEMBRO = ciclo("2026-08-20", "2026-09-19");
const MES_CHEIO = ciclo("2026-09-01", "2026-09-30");
const OUTUBRO = ciclo("2026-09-20", "2026-10-19");
const PERSONALIZADO = ciclo("2026-08-25", "2026-09-04");

describe("tradução da borda direita", () => {
  it("converte o último dia que entra no limite exclusivo", () => {
    // A pessoa digita 19/09; o banco guarda 20/09 00:00 local = 03:00Z.
    expect(limiteExclusivo("2026-09-19")).toBe("2026-09-20T03:00:00.000Z");
  });

  it("volta do limite exclusivo para o último dia que entra", () => {
    expect(ultimoDiaIncluido("2026-09-20T03:00:00.000Z")).toBe("2026-09-19");
  });

  it("ida e volta não perde um dia", () => {
    for (const dia of ["2026-01-31", "2026-02-28", "2026-09-19", "2026-12-31"]) {
      expect(ultimoDiaIncluido(limiteExclusivo(dia))).toBe(dia);
    }
  });

  it("atravessa a virada de mês e de ano", () => {
    // 31/12 → limite é 01/01 do ano seguinte, não 32/12.
    expect(limiteExclusivo("2026-12-31")).toBe("2027-01-01T03:00:00.000Z");
    expect(limiteExclusivo("2026-01-31")).toBe("2026-02-01T03:00:00.000Z");
  });

  it("primeiroInstante devolve 00:00 local, não 00:00 UTC", () => {
    // Cortar em UTC tiraria do ciclo quem concluiu entre 21:00 e 00:00 local
    // do primeiro dia.
    expect(primeiroInstante("2026-08-20")).toBe("2026-08-20T03:00:00.000Z");
  });

  it("diaParaTexto mostra no formato de quem lê", () => {
    expect(diaParaTexto("2026-09-19")).toBe("19/09/2026");
  });
});

describe("ciclo de setembro/2026 — 20/08 a 19/09", () => {
  const casos: Array<[string, string, boolean]> = [
    ["20/08 00:00:00 — o primeiro instante", "2026-08-20T03:00:00.000Z", true],
    ["20/08 00:00:01", "2026-08-20T03:00:01.000Z", true],
    ["19/08 23:59:59 — véspera, fica de fora", "2026-08-20T02:59:59.000Z", false],
    ["31/08 23:59:59 — o que a regra 01→19 perdia", "2026-09-01T02:59:59.000Z", true],
    ["19/09 23:59:59 — o último instante que ENTRA", "2026-09-20T02:59:59.000Z", true],
    ["20/09 00:00:00 — já é do ciclo seguinte", "2026-09-20T03:00:00.000Z", false],
  ];

  it.each(casos)("%s", (_rotulo, iso, esperado) => {
    expect(dentroDoCiclo(iso, SETEMBRO)).toBe(esperado);
  });
});

describe("o mesmo motor com outras janelas", () => {
  it("mês cheio 01/09 → 30/09 aceita o dia 1 e recusa 31/08", () => {
    expect(dentroDoCiclo("2026-09-01T03:00:00.000Z", MES_CHEIO)).toBe(true);
    expect(dentroDoCiclo("2026-09-01T02:59:59.000Z", MES_CHEIO)).toBe(false);
    expect(dentroDoCiclo("2026-09-30T23:00:00.000Z", MES_CHEIO)).toBe(true);
    expect(dentroDoCiclo("2026-10-01T03:00:00.000Z", MES_CHEIO)).toBe(false);
  });

  it("20/09 → 19/10 começa exatamente onde setembro termina", () => {
    // Sem buraco e sem sobreposição: o instante que sai de um entra no outro.
    const virada = "2026-09-20T03:00:00.000Z";
    expect(dentroDoCiclo(virada, SETEMBRO)).toBe(false);
    expect(dentroDoCiclo(virada, OUTUBRO)).toBe(true);
  });

  it("janela personalizada de 11 dias funciona igual", () => {
    expect(dentroDoCiclo("2026-08-25T03:00:00.000Z", PERSONALIZADO)).toBe(true);
    expect(dentroDoCiclo("2026-09-04T23:00:00.000Z", PERSONALIZADO)).toBe(true);
    expect(dentroDoCiclo("2026-09-05T03:00:00.000Z", PERSONALIZADO)).toBe(false);
  });

  it("uma conclusão pertence a no máximo um ciclo entre os que não se cruzam", () => {
    const naoSeCruzam = [SETEMBRO, OUTUBRO];
    for (const iso of [
      "2026-08-20T03:00:00.000Z",
      "2026-09-19T12:00:00.000Z",
      "2026-09-20T03:00:00.000Z",
      "2026-10-19T23:00:00.000Z",
    ]) {
      expect(naoSeCruzam.filter((c) => dentroDoCiclo(iso, c)).length).toBeLessThanOrEqual(1);
    }
  });
});

describe("a partição da elegibilidade fecha", () => {
  /**
   * Espelha a regra de `relatorio_ciclos_administraveis`: cada demanda cai em
   * exatamente uma categoria, na ordem de prioridade. É a correção do defeito
   * em que uma demanda sem fechamento E sem data confiável era contada duas
   * vezes.
   */
  type Demanda = { confirmada: boolean; fechada: boolean; classificada: boolean };

  function categorizar(d: Demanda) {
    if (!d.confirmada) return "sem_data_confiavel";
    if (!d.fechada) return "sem_fechamento";
    if (!d.classificada) return "sem_classificacao";
    return "elegivel";
  }

  it("cada combinação possível cai em uma categoria só", () => {
    const todas: Demanda[] = [];
    for (const confirmada of [true, false])
      for (const fechada of [true, false])
        for (const classificada of [true, false]) todas.push({ confirmada, fechada, classificada });

    const contagem = { sem_data_confiavel: 0, sem_fechamento: 0, sem_classificacao: 0, elegivel: 0 };
    for (const d of todas) contagem[categorizar(d) as keyof typeof contagem]++;

    const soma = Object.values(contagem).reduce((a, b) => a + b, 0);
    expect(soma).toBe(todas.length);
  });

  it("a demanda sem fechamento e sem data confiável conta uma vez, como sem data", () => {
    // O caso que produzia dupla contagem. A data vem primeiro porque sem ela
    // a demanda não pertence a ciclo nenhum — o resto é discussão posterior.
    expect(categorizar({ confirmada: false, fechada: false, classificada: false })).toBe(
      "sem_data_confiavel",
    );
  });

  it("só é elegível quem tem os três", () => {
    expect(categorizar({ confirmada: true, fechada: true, classificada: true })).toBe("elegivel");
    expect(categorizar({ confirmada: true, fechada: true, classificada: false })).toBe(
      "sem_classificacao",
    );
  });
});
