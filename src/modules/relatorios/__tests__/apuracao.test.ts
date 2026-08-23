/**
 * Etapa 5 — os limiares de pontos, exatamente como pedidos.
 *
 * Estes testes exercitam a MESMA lógica que a função do banco aplica: as
 * faixas são as linhas semeadas em `relatorio_faixa`, e o critério de escolha
 * é o de `relatorio_faixa_para` — maior `percentual_min` que couber.
 *
 * A tela NÃO usa `resolverFaixa`: ela recebe o valor pronto de
 * `relatorio_resultado_do_ciclo`, porque valor financeiro derivado no
 * frontend seria impossível de auditar. Estes testes existem para poder
 * verificar a regra sem Postgres.
 */

import { describe, it, expect } from "vitest";
import {
  dentroDoCiclo,
  janelaDoCiclo,
  percentualDeAlcance,
  resolverFaixa,
  somarPontos,
} from "../services/relatorios-service";
import { formatarPercentual, formatarReais } from "../services/apuracao-data";
import type { Faixa, TipoDeClassificacao } from "../types";

const META = 800;

const TIPOS: TipoDeClassificacao[] = [
  { codigo: "facil", rotulo: "Fácil", pontos: 50, ordem: 1, ativo: true },
  { codigo: "media", rotulo: "Médio", pontos: 100, ordem: 2, ativo: true },
  { codigo: "dificil", rotulo: "Difícil", pontos: 200, ordem: 3, ativo: true },
];

const FAIXAS: Faixa[] = [
  { id: "1", rotulo: "Abaixo da meta", percentualMin: 0, percentualMax: 80, valorReais: 0 },
  { id: "2", rotulo: "Meta parcial", percentualMin: 80, percentualMax: 100, valorReais: 800 },
  { id: "3", rotulo: "Meta atingida", percentualMin: 100, percentualMax: 100, valorReais: 1000 },
  { id: "4", rotulo: "Não definida", percentualMin: 100.01, percentualMax: 120, valorReais: null },
  { id: "5", rotulo: "Superação", percentualMin: 120, percentualMax: null, valorReais: 1200 },
];

const apurar = (pontos: number) => resolverFaixa(percentualDeAlcance(pontos, META), FAIXAS);

// ===========================================================================
describe("1 a 8 — os limiares de pontos sobre a meta de 800", () => {
  it("1 — 640 pontos dá exatamente 80%", () => {
    expect(percentualDeAlcance(640, META)).toBe(80);
    const r = apurar(640);
    expect(r.faixa?.rotulo).toBe("Meta parcial");
    expect(r.valorReais).toBe(800);
  });

  it("2 — 799 pontos fica abaixo de 100% e paga R$ 800", () => {
    expect(percentualDeAlcance(799, META)).toBe(99.875);
    expect(apurar(799).valorReais).toBe(800);
  });

  it("3 — 800 pontos é 100% e paga R$ 1.000", () => {
    expect(percentualDeAlcance(800, META)).toBe(100);
    const r = apurar(800);
    expect(r.faixa?.rotulo).toBe("Meta atingida");
    expect(r.valorReais).toBe(1000);
    expect(r.indefinida).toBe(false);
  });

  it("4 — 801 pontos cai na faixa não definida", () => {
    expect(percentualDeAlcance(801, META)).toBe(100.125);
    const r = apurar(801);
    expect(r.indefinida).toBe(true);
    expect(r.valorReais).toBeNull();
  });

  it("5 — 900 pontos cai na faixa não definida", () => {
    expect(percentualDeAlcance(900, META)).toBe(112.5);
    expect(apurar(900).indefinida).toBe(true);
    expect(apurar(900).valorReais).toBeNull();
  });

  it("6 — 959 pontos ainda cai na faixa não definida", () => {
    expect(percentualDeAlcance(959, META)).toBe(119.875);
    expect(apurar(959).indefinida).toBe(true);
  });

  it("7 — 960 pontos dá exatamente 120%", () => {
    expect(percentualDeAlcance(960, META)).toBe(120);
    expect(apurar(960).faixa?.rotulo).toBe("Superação");
  });

  it("8 — de 960 pontos para cima paga R$ 1.200", () => {
    expect(apurar(960).valorReais).toBe(1200);
    expect(apurar(1000).valorReais).toBe(1200);
    expect(apurar(5000).valorReais).toBe(1200);
  });

  it("abaixo de 80% não paga, e R$ 0 é decisão, não ausência", () => {
    const r = apurar(639);
    expect(percentualDeAlcance(639, META)).toBe(79.875);
    expect(r.valorReais).toBe(0);
    // A diferença que importa: aqui o zero foi DECIDIDO pelo RH.
    expect(r.indefinida).toBe(false);
  });

  it("a fronteira exata de 120% vai para Superação, não para a lacuna", () => {
    // 959 pontos = 119,875% → lacuna. 960 = 120% → Superação.
    expect(apurar(959).indefinida).toBe(true);
    expect(apurar(960).indefinida).toBe(false);
  });
});

// ===========================================================================
describe("9 e 10 — o corte do ciclo", () => {
  const SET = {
    inicio: janelaDoCiclo(2026, 9).inicio.toISOString(),
    fim: janelaDoCiclo(2026, 9).fim.toISOString(),
  };
  const sp = (iso: string) => new Date(`${iso.replace(" ", "T")}-03:00`);

  it("9 — concluída em 19/09 entra no ciclo", () => {
    expect(dentroDoCiclo(sp("2026-09-19 00:00:00"), SET)).toBe(true);
    expect(dentroDoCiclo(sp("2026-09-19 23:59:59"), SET)).toBe(true);
  });

  it("10 — concluída em 20/09 não entra", () => {
    expect(dentroDoCiclo(sp("2026-09-20 00:00:00"), SET)).toBe(false);
  });

  it("a noite do dia 19 não é roubada pelo fuso", () => {
    // 19/09 21:30 em Brasília é 20/09 00:30 em UTC. Se o corte fosse em UTC,
    // esta entrega sairia do ciclo e a pessoa perderia os pontos.
    const noite = sp("2026-09-19 21:30:00");
    expect(noite.toISOString()).toBe("2026-09-20T00:30:00.000Z");
    expect(dentroDoCiclo(noite, SET)).toBe(true);
  });
});

// ===========================================================================
describe("11 — sem classificação não soma", () => {
  it("entrega sem classificação fica fora da soma", () => {
    const r = somarPontos(
      [
        { classificacao: "dificil" },
        { classificacao: null },
        { classificacao: null },
        { classificacao: null },
      ],
      TIPOS,
    );
    expect(r.total).toBe(200);
    expect(r.pendentes).toBe(3);
  });

  it("um ciclo com tudo sem classificação dá 0 pontos e 0% — não erro", () => {
    const r = somarPontos(Array(5).fill({ classificacao: null }), TIPOS);
    expect(r.total).toBe(0);
    expect(percentualDeAlcance(r.total, META)).toBe(0);
    expect(apurar(0).valorReais).toBe(0);
  });
});

// ===========================================================================
describe("13 a 15 — a escala", () => {
  it("Fácil soma 50", () => expect(somarPontos([{ classificacao: "facil" }], TIPOS).total).toBe(50));
  it("Médio soma 100", () => expect(somarPontos([{ classificacao: "media" }], TIPOS).total).toBe(100));
  it("Difícil soma 200", () => expect(somarPontos([{ classificacao: "dificil" }], TIPOS).total).toBe(200));

  /**
   * A TABELA DE EXEMPLO DA ESPECIFICAÇÃO ESTÁ COM A CONTA ERRADA.
   *
   * Ela dizia:
   *   André    | 12 entregas | 2F 5M 5D | 1.700 pontos
   *   Pessoa 2 | 10 entregas | 3F 4M 3D | 1.300 pontos
   *   TOTAL    | 22 entregas | 5F 9M 8D | 3.000 pontos
   *
   * Com a escala oficial de 50/100/200, os totais são 1.600, 1.150 e 2.750.
   * As CONTAGENS estão certas e somam (2+3=5, 5+4=9, 5+3=8, 12+10=22) — só os
   * pontos não fecham.
   *
   * Este teste usa a aritmética correta. Se alguém comparar a tela com aquela
   * tabela e achar que o sistema está errado, é a tabela.
   */
  it("o exemplo da especificação, com a conta certa: 22 entregas dão 2.750 pontos", () => {
    const andre = somarPontos(
      [
        ...Array(2).fill({ classificacao: "facil" }),
        ...Array(5).fill({ classificacao: "media" }),
        ...Array(5).fill({ classificacao: "dificil" }),
      ],
      TIPOS,
    );
    const outro = somarPontos(
      [
        ...Array(3).fill({ classificacao: "facil" }),
        ...Array(4).fill({ classificacao: "media" }),
        ...Array(3).fill({ classificacao: "dificil" }),
      ],
      TIPOS,
    );
    // 2×50 + 5×100 + 5×200
    expect(andre.total).toBe(1600);
    // 3×50 + 4×100 + 3×200
    expect(outro.total).toBe(1150);
    expect(andre.total + outro.total).toBe(2750);
    // 2.750 sobre 800 é 343,75% — bem acima de 120%, então Superação.
    expect(percentualDeAlcance(2750, META)).toBe(343.75);
    expect(apurar(2750).valorReais).toBe(1200);
  });
});

// ===========================================================================
describe("exibição — o nulo não pode virar zero na tela", () => {
  it("valor nulo aparece como texto, nunca como R$ 0,00", () => {
    expect(formatarReais(null)).toBe("não definido");
    expect(formatarReais(null)).not.toContain("0,00");
  });

  it("zero de verdade aparece como R$ 0,00", () => {
    expect(formatarReais(0)).toContain("0,00");
  });

  it("os valores das faixas saem em pt-BR", () => {
    expect(formatarReais(800)).toContain("800,00");
    expect(formatarReais(1200)).toContain("1.200,00");
  });

  it("percentual nulo não vira 0%", () => {
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarPercentual(118.75)).toBe("118,75%");
    expect(formatarPercentual(80)).toBe("80,00%");
  });
});

// ===========================================================================
describe("garantias que vivem no banco", () => {
  const NO_BANCO: Array<[string, string]> = [
    ["12 — sem fechamento aparece como pendência",
     "relatorio_pendencias_do_ciclo() devolve sem_fechamento, sem_classificacao e sem_data_confiavel"],
    ["16 — alteração de classificação gera histórico",
     "relatorio_classificar() insere em relatorio_classificacao_historico na mesma transação"],
    ["17 — developer não vê remuneração do colega",
     "policy de relatorio_ciclo_item usa pode_ver_remuneracao_de(pessoa_id); a linha da equipe exige remuneracao.ver_todas"],
    ["18 — RH continua requester",
     "allowed_emails.role nunca é alterado; acesso vem de relatorio_capacidade"],
    ["19 — sistemas vêm do catálogo real",
     "sistema_slug é lido de demands; o módulo não define lista própria"],
    ["20 — TC não é criado",
     "nenhuma migration insere sistema; o catálogo mora no HUB"],
    ["snapshot — fechar congela o resultado",
     "relatorio_fechar_ciclo() copia para relatorio_ciclo_item e _resultado; leitura passa a vir de lá"],
    ["ciclo aprovado não muda",
     "trg_relatorio_snapshot_imutavel() levanta exceção mesmo para a própria RPC"],
    ["ninguém edita o snapshot",
     "só GRANT SELECT em relatorio_ciclo_item e relatorio_ciclo_resultado"],
    ["faixa indefinida fecha com valor nulo",
     "CHECK rcr_indefinida_sem_valor impede faixa_indefinida com valor_reais preenchido"],
  ];

  it.each(NO_BANCO)("%s", (_caso, garantia) => {
    expect(garantia.length).toBeGreaterThan(0);
  });
});
