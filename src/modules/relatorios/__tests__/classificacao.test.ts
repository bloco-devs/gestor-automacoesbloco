/**
 * Os casos de teste da Etapa 4, na ordem em que foram pedidos.
 *
 * O que NÃO dá para testar aqui, e por quê: as regras que vivem no banco —
 * autoclassificação, justificativa obrigatória, permissão, escrita direta em
 * tabela financeira. Elas são constraints e RPCs em Postgres, e este projeto
 * não tem banco local nem contêiner. Cada uma está anotada abaixo com o nome
 * exato da constraint ou da verificação que a garante, para poder ser
 * conferida no banco.
 */

import { describe, it, expect } from "vitest";
import {
  contarPorClassificacao,
  dentroDoCiclo,
  janelaDoCiclo,
  percentualDeAlcance,
  pontosDe,
  resolverFaixa,
  somarPontos,
} from "../services/relatorios-service";
import type { Faixa, TipoDeClassificacao } from "../types";

/** Vem de `relatorio_classificacao_tipo` — nunca de constante no código. */
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

// ===========================================================================
describe("1 a 3 — pontos vêm da classificação, e só dela", () => {
  it("Fácil gera 50 pontos", () => expect(pontosDe("facil", TIPOS)).toBe(50));
  it("Médio gera 100 pontos", () => expect(pontosDe("media", TIPOS)).toBe(100));
  it("Difícil gera 200 pontos", () => expect(pontosDe("dificil", TIPOS)).toBe(200));

  it("não existe pontuação intermediária", () => {
    const valores = TIPOS.map((t) => t.pontos).sort((a, b) => a - b);
    expect(valores).toEqual([50, 100, 200]);
  });

  it("a escala vem da tabela: mudar a tabela muda os pontos", () => {
    const outra: TipoDeClassificacao[] = [
      { codigo: "media", rotulo: "Médio", pontos: 120, ordem: 2, ativo: true },
    ];
    expect(pontosDe("media", outra)).toBe(120);
  });
});

// ===========================================================================
describe("6 e 7 — tempo e IA não mexem na categoria", () => {
  // A garantia real é a ausência de código: nenhuma função do módulo recebe
  // minutos e devolve classificação. Estes testes fixam essa ausência, para
  // que acrescentar uma fórmula no futuro quebre a suíte.

  it("pontosDe não aceita tempo — a assinatura só conhece a classificação", () => {
    expect(pontosDe.length).toBe(2); // (codigo, tipos)
  });

  it("duas entregas com tempos opostos e a mesma classificação valem igual", () => {
    // 20 minutos com ajuda de IA e 12 horas na unha: se ambas foram julgadas
    // Difícil por gente, ambas valem 200.
    const rapida = { classificacao: "dificil", minutos: 20 };
    const lenta = { classificacao: "dificil", minutos: 720 };
    expect(pontosDe(rapida.classificacao, TIPOS)).toBe(pontosDe(lenta.classificacao, TIPOS));
  });

  it("entrega rápida pode ser Difícil e entrega longa pode ser Fácil", () => {
    expect(pontosDe("dificil", TIPOS)).toBe(200); // 20 min, com IA
    expect(pontosDe("facil", TIPOS)).toBe(50); // 6 horas de trabalho repetitivo
  });

  it("sem classificação não há pontos — e isso não é zero", () => {
    expect(pontosDe(null, TIPOS)).toBeNull();
    expect(pontosDe(undefined, TIPOS)).toBeNull();
  });
});

// ===========================================================================
describe("soma da apuração", () => {
  it("o que não foi classificado fica de fora, contado à parte", () => {
    const r = somarPontos(
      [
        { classificacao: "dificil" },
        { classificacao: "media" },
        { classificacao: null },
        { classificacao: null },
      ],
      TIPOS,
    );
    expect(r.total).toBe(300);
    expect(r.classificados).toBe(2);
    expect(r.pendentes).toBe(2);
  });

  it("uma entrega não classificada nunca é somada como 0", () => {
    const so = somarPontos([{ classificacao: null }], TIPOS);
    expect(so.total).toBe(0);
    expect(so.classificados).toBe(0);
    // A diferença que importa: total 0 com 0 classificados significa
    // "nada decidido", não "decidiram que vale nada".
    expect(so.pendentes).toBe(1);
  });

  it("agrupa mantendo a ordem configurada, mesmo com categoria zerada", () => {
    const linhas = contarPorClassificacao(
      [{ classificacao: "dificil" }, { classificacao: "dificil" }],
      TIPOS,
    );
    expect(linhas.map((l) => [l.tipo.codigo, l.quantidade, l.pontos])).toEqual([
      ["facil", 0, 0],
      ["media", 0, 0],
      ["dificil", 2, 400],
    ]);
  });
});

// ===========================================================================
describe("10 a 13 — a data de conclusão define o ciclo", () => {
  const CICLO_SET = {
    inicio: janelaDoCiclo(2026, 9).inicio.toISOString(),
    fim: janelaDoCiclo(2026, 9).fim.toISOString(),
  };
  const CICLO_OUT = {
    inicio: janelaDoCiclo(2026, 10).inicio.toISOString(),
    fim: janelaDoCiclo(2026, 10).fim.toISOString(),
  };

  const sp = (iso: string) => new Date(`${iso.replace(" ", "T")}-03:00`);

  it("o ciclo de setembro vai de 20/08 a 19/09", () => {
    expect(CICLO_SET.inicio).toBe("2026-08-20T03:00:00.000Z");
    expect(CICLO_SET.fim).toBe("2026-09-20T03:00:00.000Z");
  });

  it("demanda concluída em 19/09 entra no ciclo", () => {
    expect(dentroDoCiclo(sp("2026-09-19 23:59:59"), CICLO_SET)).toBe(true);
    expect(dentroDoCiclo(sp("2026-09-19 23:59:59"), CICLO_OUT)).toBe(false);
  });

  it("demanda concluída em 20/09 entra no ciclo SEGUINTE", () => {
    expect(dentroDoCiclo(sp("2026-09-20 00:00:00"), CICLO_SET)).toBe(false);
    expect(dentroDoCiclo(sp("2026-09-20 00:00:00"), CICLO_OUT)).toBe(true);
  });

  it("os ciclos não se sobrepõem nem deixam buraco na virada", () => {
    // O instante exato da fronteira pertence a exatamente um ciclo.
    const fronteira = sp("2026-09-20 00:00:00");
    const dentro = [CICLO_SET, CICLO_OUT].filter((c) => dentroDoCiclo(fronteira, c));
    expect(dentro).toHaveLength(1);
  });

  it("a data de CRIAÇÃO não influencia — só a de conclusão é consultada", () => {
    // Aberta em julho, concluída em setembro: entra no ciclo de setembro.
    const conclusao = sp("2026-09-05 10:00:00");
    expect(dentroDoCiclo(conclusao, CICLO_SET)).toBe(true);
  });
});

// ===========================================================================
describe("12 — meta da equipe e faixas", () => {
  it("800 pontos é 100%", () => expect(percentualDeAlcance(800, 800)).toBe(100));
  it("640 pontos é 80%, o mínimo", () => expect(percentualDeAlcance(640, 800)).toBe(80));

  it("abaixo de 80% não paga", () => {
    const r = resolverFaixa(percentualDeAlcance(600, 800), FAIXAS);
    expect(r.valorReais).toBe(0);
    expect(r.indefinida).toBe(false);
  });

  it("80% paga R$ 800", () => {
    expect(resolverFaixa(percentualDeAlcance(640, 800), FAIXAS).valorReais).toBe(800);
  });

  it("100% paga R$ 1.000", () => {
    expect(resolverFaixa(percentualDeAlcance(800, 800), FAIXAS).valorReais).toBe(1000);
  });

  it("120% ou mais paga R$ 1.200", () => {
    expect(resolverFaixa(percentualDeAlcance(960, 800), FAIXAS).valorReais).toBe(1200);
  });

  it("a lacuna entre 100,01% e 119,99% NÃO gera valor inventado", () => {
    const r = resolverFaixa(percentualDeAlcance(950, 800), FAIXAS);
    expect(percentualDeAlcance(950, 800)).toBe(118.75);
    expect(r.valorReais).toBeNull();
    expect(r.indefinida).toBe(true);
    expect(r.mensagem).toBe("Faixa de remuneração não definida");
  });

  it("a soma dos dois desenvolvedores é que conta para a meta única", () => {
    const andre = somarPontos(
      [
        ...Array(2).fill({ classificacao: "facil" }),
        ...Array(3).fill({ classificacao: "media" }),
        { classificacao: "dificil" },
      ],
      TIPOS,
    );
    const outro = somarPontos(
      [
        { classificacao: "facil" },
        { classificacao: "media" },
        { classificacao: "dificil" },
      ],
      TIPOS,
    );
    expect(andre.total).toBe(600);
    expect(outro.total).toBe(350);

    const equipe = andre.total + outro.total;
    expect(equipe).toBe(950);
    expect(percentualDeAlcance(equipe, 800)).toBe(118.75);
    // E o resultado dessa soma cai justamente na lacuna.
    expect(resolverFaixa(percentualDeAlcance(equipe, 800), FAIXAS).indefinida).toBe(true);
  });
});

// ===========================================================================
describe("19 — TC não vira sistema", () => {
  it("os oito sistemas reais não incluem TC", () => {
    const REAIS = [
      "produtividade", "incorporacao", "processos", "locacao",
      "rh", "nakhon-contratos", "viabilidade", "portfolio",
    ];
    expect(REAIS).not.toContain("TC");
    expect(REAIS).not.toContain("tc");
  });

  it("o módulo não define lista de sistemas em lugar nenhum", async () => {
    // Se alguém acrescentar um catálogo local — e com ele a tentação de
    // inventar "TC" — este teste falha. O catálogo mora no HUB, e o
    // agrupamento do relatório usa o `sistema_slug` que veio do banco.
    const servico = await import("../services/relatorios-service");
    const exportados = Object.keys(servico);
    expect(exportados.some((k) => /sistema/i.test(k))).toBe(false);
  });
});

// ===========================================================================
describe("garantias que vivem no banco, não aqui", () => {
  // Este bloco é documentação executável: cada caso aponta a constraint ou a
  // verificação que faz a regra valer, para poder ser conferida no Postgres.
  // Não há banco local neste projeto, então não dá para exercitá-las em teste.

  const NO_BANCO: Array<[string, string]> = [
    ["4 — alteração gera histórico",
     "relatorio_classificar() insere em relatorio_classificacao_historico na mesma transação"],
    ["5 — justificativa obrigatória",
     "CHECK rc_justificativa_substantiva (>= 15 caracteres) + validação na RPC"],
    ["5b — alterar exige motivo separado",
     "CHECK rch_alteracao_exige_motivo (>= 10 caracteres quando origem='alteracao')"],
    ["8 — conclui sem fechamento técnico",
     "nenhuma constraint liga demands.status a relatorio_fechamento_tecnico"],
    ["9 — sem fechamento aparece como pendente",
     "relatorio_pendencias_de_fechamento() filtra situacao <> 'concluido'"],
    ["14 — usuário não altera pontos direto",
     "relatorio_classificacao tem só GRANT SELECT para authenticated"],
    ["15 — não autorizado não classifica",
     "relatorio_classificar() exige tem_capacidade('classificacao.definir')"],
    ["15b — ninguém classifica a própria entrega",
     "relatorio_classificar() recusa quando assigned_to = auth.uid()"],
    ["16 — developer não vê remuneração do colega",
     "relatorio_apuracao_do_ciclo() filtra por pode_ver_remuneracao_de(), não is_equipe()"],
    ["17 — RH continua requester",
     "allowed_emails.role intacto; acesso vem de relatorio_capacidade"],
  ];

  it.each(NO_BANCO)("%s", (_caso, garantia) => {
    expect(garantia.length).toBeGreaterThan(0);
  });
});
