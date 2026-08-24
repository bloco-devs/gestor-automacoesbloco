import { describe, it, expect } from "vitest";
import {
  cicloDe,
  contarPorClassificacao,
  dentroDoCiclo,
  dentroDoPeriodo,
  deSaoPauloParaUtc,
  formatarData,
  janelaDoCiclo,
  partesEmSaoPaulo,
  percentualDeAlcance,
  periodoDoAtalho,
  periodoPersonalizado,
  pontosDe,
  resolverFaixa,
  somarPontos,
} from "../services/relatorios-service";
import type { Ciclo, Faixa, TipoDeClassificacao } from "../types";

// A escala oficial. Vem do banco em produção; aqui é fixture.
const TIPOS: TipoDeClassificacao[] = [
  { codigo: "facil", rotulo: "Fácil", pontos: 50, ordem: 1, ativo: true },
  { codigo: "media", rotulo: "Médio", pontos: 100, ordem: 2, ativo: true },
  { codigo: "dificil", rotulo: "Difícil", pontos: 200, ordem: 3, ativo: true },
];

// As faixas semeadas na migration, com os topos encostando nas bases.
const FAIXAS: Faixa[] = [
  { id: "1", rotulo: "Abaixo da meta", percentualMin: 0, percentualMax: 80, valorReais: 0 },
  { id: "2", rotulo: "Meta parcial", percentualMin: 80, percentualMax: 100, valorReais: 800 },
  { id: "3", rotulo: "Meta atingida", percentualMin: 100, percentualMax: 100, valorReais: 1000 },
  { id: "4", rotulo: "Não definida", percentualMin: 100.01, percentualMax: 120, valorReais: null },
  { id: "5", rotulo: "Superação", percentualMin: 120, percentualMax: null, valorReais: 1200 },
];

/** Um instante a partir da hora de parede em São Paulo. */
const sp = (iso: string) => {
  const [d, t = "00:00:00"] = iso.split(" ");
  const [a, m, dia] = d.split("-").map(Number);
  const [h, min, s] = t.split(":").map(Number);
  return deSaoPauloParaUtc(a, m, dia, h, min, s);
};

// ===========================================================================
describe("fuso horário", () => {
  it("converte hora de parede de São Paulo para UTC", () => {
    // Brasil sem horário de verão desde 2019: UTC-3 o ano todo.
    expect(sp("2026-08-20 00:00:00").toISOString()).toBe("2026-08-20T03:00:00.000Z");
    expect(sp("2026-09-20 00:00:00").toISOString()).toBe("2026-09-20T03:00:00.000Z");
  });

  it("volta de UTC para as partes locais sem perder o dia", () => {
    // 19/09 21:30 em Brasília é 20/09 00:30 em UTC — o caso que um corte
    // feito em UTC jogaria para fora do ciclo.
    const instante = sp("2026-09-19 21:30:00");
    expect(instante.toISOString()).toBe("2026-09-20T00:30:00.000Z");
    const p = partesEmSaoPaulo(instante);
    expect(p.dia).toBe(19);
    expect(p.hora).toBe(21);
  });
});

// ===========================================================================
describe("ciclo de apuração 20 → 19", () => {
  it("setembro/2026 vai de 20/08 a 20/09 (exclusivo)", () => {
    const j = janelaDoCiclo(2026, 9);
    expect(j.inicio.toISOString()).toBe("2026-08-20T03:00:00.000Z");
    expect(j.fim.toISOString()).toBe("2026-09-20T03:00:00.000Z");
    expect(j.rotulo).toBe("Setembro/2026");
  });

  it("janeiro olha para dezembro do ano anterior", () => {
    const j = janelaDoCiclo(2027, 1);
    expect(partesEmSaoPaulo(j.inicio)).toMatchObject({ ano: 2026, mes: 12, dia: 20 });
    expect(partesEmSaoPaulo(j.fim)).toMatchObject({ ano: 2027, mes: 1, dia: 20 });
  });

  /**
   * ESTE TESTE MUDOU DE AFIRMAÇÃO, e a diferença é o ponto.
   *
   * Antes ele dizia "começa e termina sempre no dia 20, em qualquer mês" — o
   * que transformava uma decisão administrativa do RH em invariante do
   * sistema. Um teste assim não protege nada: ele reprova a mudança correta no
   * dia em que o RH definir 01/09 → 30/09, e faz o desenvolvedor da vez achar
   * que quebrou algo quando na verdade acertou.
   *
   * O que se testa agora é o contrato real: `janelaDoCiclo` é a SUGESTÃO de
   * uma janela 20 → 19 para preencher formulário. O período de um ciclo de
   * verdade vem de `relatorio_ciclo.inicio`/`fim`, e está exercitado em
   * `ciclos.test.ts` com três janelas diferentes.
   */
  it("a sugestão 20→19 é consistente em qualquer mês", () => {
    for (let mes = 1; mes <= 12; mes++) {
      const j = janelaDoCiclo(2026, mes);
      expect(partesEmSaoPaulo(j.inicio).dia).toBe(20);
      expect(partesEmSaoPaulo(j.fim).dia).toBe(20);
    }
  });

  it("é sugestão, não regra: o ciclo real usa as datas configuradas", () => {
    // Uma janela que o RH poderia definir amanhã, sem tocar em código. Se
    // alguém reintroduzir a regra fixa, isto quebra — que é o alarme.
    const mesCheio = {
      inicio: deSaoPauloParaUtc(2026, 9, 1).toISOString(),
      fim: deSaoPauloParaUtc(2026, 10, 1).toISOString(),
    };
    expect(dentroDoCiclo("2026-09-01T03:00:00.000Z", mesCheio)).toBe(true);
    expect(dentroDoCiclo("2026-09-30T23:00:00.000Z", mesCheio)).toBe(true);
    // 19/09 não tem nada de especial numa janela de mês cheio.
    expect(dentroDoCiclo("2026-09-20T03:00:00.000Z", mesCheio)).toBe(true);
    expect(dentroDoCiclo("2026-10-01T03:00:00.000Z", mesCheio)).toBe(false);
  });

  // As bordas. Cada linha aqui é dinheiro de alguém.
  const CICLO = {
    inicio: janelaDoCiclo(2026, 9).inicio.toISOString(),
    fim: janelaDoCiclo(2026, 9).fim.toISOString(),
  };

  it.each([
    ["19/08 23:59:59 — véspera", "2026-08-19 23:59:59", false],
    ["20/08 00:00:00 — primeiro instante", "2026-08-20 00:00:00", true],
    ["31/08 23:59:59 — o que a regra 01→19 perdia", "2026-08-31 23:59:59", true],
    ["01/09 00:00:00", "2026-09-01 00:00:00", true],
    ["19/09 21:30 — a noite que UTC roubaria", "2026-09-19 21:30:00", true],
    ["19/09 23:59:59 — último instante", "2026-09-19 23:59:59", true],
    ["20/09 00:00:00 — já é o ciclo seguinte", "2026-09-20 00:00:00", false],
  ])("%s", (_nome, momento, esperado) => {
    expect(dentroDoCiclo(sp(momento as string), CICLO)).toBe(esperado);
  });

  it("não chuta ciclo quando o momento não pertence a nenhum", () => {
    const ciclos: Ciclo[] = [
      {
        id: "c1", rotulo: "Setembro/2026", referencia: "2026-09-01",
        inicio: CICLO.inicio, fim: CICLO.fim, metaPontos: 800, situacao: "aberto",
      },
    ];
    expect(cicloDe(sp("2026-09-01 10:00:00"), ciclos)?.id).toBe("c1");
    expect(cicloDe(sp("2026-10-05 10:00:00"), ciclos)).toBeNull();
  });
});

// ===========================================================================
describe("pontos", () => {
  it("50 / 100 / 200", () => {
    expect(pontosDe("facil", TIPOS)).toBe(50);
    expect(pontosDe("media", TIPOS)).toBe(100);
    expect(pontosDe("dificil", TIPOS)).toBe(200);
  });

  it("sem classificação devolve null, e null não é zero", () => {
    expect(pontosDe(null, TIPOS)).toBeNull();
    expect(pontosDe("inexistente", TIPOS)).toBeNull();
  });

  it("soma só o que foi classificado e conta o resto como pendente", () => {
    const r = somarPontos(
      [
        { classificacao: "facil" },
        { classificacao: "dificil" },
        { classificacao: null },
        { classificacao: "media" },
        { classificacao: null },
      ],
      TIPOS,
    );
    expect(r.total).toBe(350);
    expect(r.classificados).toBe(3);
    expect(r.pendentes).toBe(2);
  });

  it("o exemplo do RH: 2 fáceis, 3 médios, 1 difícil = 600", () => {
    const itens = [
      ...Array(2).fill({ classificacao: "facil" }),
      ...Array(3).fill({ classificacao: "media" }),
      { classificacao: "dificil" },
    ];
    expect(somarPontos(itens, TIPOS).total).toBe(600);
  });

  it("agrupa por classificação na ordem configurada", () => {
    const linhas = contarPorClassificacao(
      [{ classificacao: "dificil" }, { classificacao: "facil" }, { classificacao: "facil" }],
      TIPOS,
    );
    expect(linhas.map((l) => l.tipo.codigo)).toEqual(["facil", "media", "dificil"]);
    expect(linhas[0]).toMatchObject({ quantidade: 2, pontos: 100 });
    expect(linhas[1]).toMatchObject({ quantidade: 0, pontos: 0 });
    expect(linhas[2]).toMatchObject({ quantidade: 1, pontos: 200 });
  });
});

// ===========================================================================
describe("meta e faixa de remuneração", () => {
  it("percentual da meta da equipe", () => {
    expect(percentualDeAlcance(800, 800)).toBe(100);
    expect(percentualDeAlcance(950, 800)).toBe(118.75);
    expect(percentualDeAlcance(600, 800)).toBe(75);
    expect(percentualDeAlcance(0, 800)).toBe(0);
  });

  it.each([
    ["0% — nada feito", 0, "Abaixo da meta", 0],
    ["79,995% — logo abaixo do corte", 79.995, "Abaixo da meta", 0],
    ["80% — o corte exato", 80, "Meta parcial", 800],
    ["99,875% = 799 pts sobre 800", 99.875, "Meta parcial", 800],
    ["99,995% — vão que já foi fechado", 99.995, "Meta parcial", 800],
    ["100% — meta batida", 100, "Meta atingida", 1000],
    ["120% — superação exata", 120, "Superação", 1200],
    ["150% — bem acima", 150, "Superação", 1200],
  ])("%s", (_nome, pct, rotulo, valor) => {
    const r = resolverFaixa(pct as number, FAIXAS);
    expect(r.faixa?.rotulo).toBe(rotulo);
    expect(r.valorReais).toBe(valor);
    expect(r.indefinida).toBe(false);
  });

  it.each([
    ["106,25% = 850 pts sobre 800", 106.25],
    ["118,75% = 950 pts sobre 800 — o exemplo do RH", 118.75],
    ["119,995% — vão que já foi fechado", 119.995],
  ])("%s cai na lacuna e NÃO gera valor", (_nome, pct) => {
    const r = resolverFaixa(pct as number, FAIXAS);
    expect(r.faixa?.rotulo).toBe("Não definida");
    expect(r.valorReais).toBeNull();
    expect(r.indefinida).toBe(true);
    expect(r.mensagem).toBe("Faixa de remuneração não definida");
  });

  it("o caso completo do RH: 950 pontos sobre meta 800 não vira dinheiro", () => {
    const pct = percentualDeAlcance(950, 800);
    expect(pct).toBe(118.75);
    const r = resolverFaixa(pct, FAIXAS);
    expect(r.indefinida).toBe(true);
    expect(r.valorReais).toBeNull();
  });

  it("percentual órfão também é 'não definida', nunca R$ 0", () => {
    // Entre 100 e 100,01 não há faixa — é o vão do próprio desenho do RH.
    const r = resolverFaixa(100.005, FAIXAS);
    expect(r.faixa).toBeNull();
    expect(r.valorReais).toBeNull();
    expect(r.indefinida).toBe(true);
    expect(r.mensagem).toBe("Faixa de remuneração não definida");
  });
});

// ===========================================================================
describe("períodos do relatório técnico", () => {
  // Quinta-feira, 20/08/2026, 15h em São Paulo.
  const AGORA = sp("2026-08-20 15:00:00");

  it("'este mês' é o mês INTEIRO — o dia 19 não corta o histórico", () => {
    const p = periodoDoAtalho("este_mes", AGORA);
    expect(partesEmSaoPaulo(p.inicio)).toMatchObject({ ano: 2026, mes: 8, dia: 1 });
    expect(partesEmSaoPaulo(p.fim)).toMatchObject({ ano: 2026, mes: 9, dia: 1 });
    // Uma atividade do dia 25 aparece no relatório técnico de agosto.
    expect(dentroDoPeriodo(sp("2026-08-25 10:00:00"), p)).toBe(true);
    expect(dentroDoPeriodo(sp("2026-08-31 23:59:59"), p)).toBe(true);
  });

  it("hoje cobre o dia inteiro em São Paulo", () => {
    const p = periodoDoAtalho("hoje", AGORA);
    expect(dentroDoPeriodo(sp("2026-08-20 00:00:00"), p)).toBe(true);
    expect(dentroDoPeriodo(sp("2026-08-20 23:59:59"), p)).toBe(true);
    expect(dentroDoPeriodo(sp("2026-08-19 23:59:59"), p)).toBe(false);
    expect(dentroDoPeriodo(sp("2026-08-21 00:00:00"), p)).toBe(false);
  });

  it("esta semana começa na segunda", () => {
    // 20/08/2026 é quinta; a segunda é dia 17.
    const p = periodoDoAtalho("esta_semana", AGORA);
    expect(partesEmSaoPaulo(p.inicio)).toMatchObject({ mes: 8, dia: 17 });
    expect(partesEmSaoPaulo(p.fim)).toMatchObject({ mes: 8, dia: 24 });
  });

  it("semana anterior não encosta na atual", () => {
    const p = periodoDoAtalho("semana_anterior", AGORA);
    expect(partesEmSaoPaulo(p.inicio)).toMatchObject({ mes: 8, dia: 10 });
    expect(partesEmSaoPaulo(p.fim)).toMatchObject({ mes: 8, dia: 17 });
  });

  it("mês anterior atravessa a virada de ano", () => {
    const p = periodoDoAtalho("mes_anterior", sp("2027-01-10 12:00:00"));
    expect(partesEmSaoPaulo(p.inicio)).toMatchObject({ ano: 2026, mes: 12, dia: 1 });
    expect(partesEmSaoPaulo(p.fim)).toMatchObject({ ano: 2027, mes: 1, dia: 1 });
  });

  it("este ano é 01/01 a 01/01 do seguinte", () => {
    const p = periodoDoAtalho("este_ano", AGORA);
    expect(partesEmSaoPaulo(p.inicio)).toMatchObject({ ano: 2026, mes: 1, dia: 1 });
    expect(partesEmSaoPaulo(p.fim)).toMatchObject({ ano: 2027, mes: 1, dia: 1 });
  });

  it("período personalizado inclui o dia final inteiro", () => {
    const p = periodoPersonalizado("2026-08-01", "2026-08-31");
    expect(dentroDoPeriodo(sp("2026-08-31 23:59:59"), p)).toBe(true);
    expect(dentroDoPeriodo(sp("2026-09-01 00:00:00"), p)).toBe(false);
    expect(p.rotulo).toBe("1/8/2026 a 31/8/2026");
  });
});

// ===========================================================================
describe("o histórico técnico e a folha são coisas diferentes", () => {
  it("atividade de 25/08 entra no relatório de agosto E no ciclo 20/08→19/09", () => {
    const momento = sp("2026-08-25 14:00:00");
    const agosto = periodoDoAtalho("este_mes", sp("2026-08-20 15:00:00"));
    const ciclo = janelaDoCiclo(2026, 9);

    expect(dentroDoPeriodo(momento, agosto)).toBe(true);
    expect(dentroDoCiclo(momento, {
      inicio: ciclo.inicio.toISOString(),
      fim: ciclo.fim.toISOString(),
    })).toBe(true);
  });

  it("atividade de 10/08 entra no relatório de agosto mas NÃO no ciclo de setembro", () => {
    const momento = sp("2026-08-10 14:00:00");
    const agosto = periodoDoAtalho("este_mes", sp("2026-08-20 15:00:00"));
    const ciclo = janelaDoCiclo(2026, 9);

    expect(dentroDoPeriodo(momento, agosto)).toBe(true);
    expect(dentroDoCiclo(momento, {
      inicio: ciclo.inicio.toISOString(),
      fim: ciclo.fim.toISOString(),
    })).toBe(false);
  });
});

// ===========================================================================
describe("exibição", () => {
  it("data sem valor não vira data inventada", () => {
    expect(formatarData(null)).toBe("Não identificada");
  });

  it("formata no fuso de São Paulo, não em UTC", () => {
    // 20/09 00:30 UTC ainda é 19/09 em Brasília.
    expect(formatarData("2026-09-20T00:30:00.000Z")).toBe("19/09/2026");
    expect(formatarData("2026-09-20T00:30:00.000Z", true)).toBe("19/09/2026 21:30");
  });
});
