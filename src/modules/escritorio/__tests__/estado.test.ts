import { describe, expect, it } from "vitest";
import {
  culpaDeTerceiro,
  estaParado,
  estadoDoSistema,
  intervaloEntreViagens,
  naoConcluiu,
  resumoDeEstados,
  semRegistroNoHub,
} from "../estado";
import { fonteDeRetratos, JANELA_ATIVIDADE_MS } from "../eventos";

const AGORA = Date.parse("2026-09-05T20:00:00Z");
const horasAtras = (h: number) => new Date(AGORA - h * 3_600_000).toISOString();

describe("estado do sistema", () => {
  it("sem histórico nenhum não é ocioso", () => {
    // Confundir os dois fazia a tela afirmar que treze sistemas estavam
    // parados quando a verdade é outra — e são DUAS verdades diferentes.
    expect(estadoDoSistema(undefined, AGORA)).toBe("sem-dados");
    expect(estadoDoSistema({ execs: 0, ok: 0, falhas: 0, ultima: null }, AGORA)).toBe("sem-execucao");
  });

  it("com histórico mas parado há mais de um dia é ocioso, não sem-dados", () => {
    expect(estadoDoSistema({ execs: 7, ok: 7, falhas: 0, ultima: horasAtras(30) }, AGORA)).toBe("ocioso");
  });

  it("nem ocioso nem sem-dados saem da mesa", () => {
    expect(estaParado("ocioso")).toBe(true);
    expect(estaParado("sem-dados")).toBe(true);
    expect(estaParado("trabalhando")).toBe(false);
    expect(estaParado("falha")).toBe(false);
  });

  it("rodou há pouco e sem falhar é trabalhando", () => {
    expect(estadoDoSistema({ execs: 100, ok: 100, falhas: 0, ultima: horasAtras(2) }, AGORA)).toBe("trabalhando");
  });

  it("parado há mais de um dia é ocioso mesmo tendo rodado no mês", () => {
    expect(estadoDoSistema({ execs: 900, ok: 900, falhas: 0, ultima: horasAtras(40) }, AGORA)).toBe("ocioso");
  });

  it("falha manda mesmo com execução recente", () => {
    expect(estadoDoSistema({ execs: 100, ok: 90, falhas: 10, ultima: horasAtras(1) }, AGORA)).toBe("falha");
  });

  it("logo abaixo do limiar ainda é trabalhando", () => {
    expect(estadoDoSistema({ execs: 1000, ok: 960, falhas: 49, ultima: horasAtras(1) }, AGORA)).toBe("trabalhando");
  });

  /*
   * OS NÚMEROS DESTE TESTE MUDARAM, e o motivo é uma suposição errada minha.
   *
   * Era `{ execs: 100, ok: 80, falhas: 20, falhas_upstream: 18 }` — que soma
   * 118 e é impossível. O fixture pressupunha que `falhas_upstream` fosse um
   * SUBCONJUNTO de `falhas` ("18 das 20 vieram de fora"). No retrato real do
   * HUB os três campos são DISJUNTOS e somam `execs` exatamente: conferido em
   * autentique (9685+1483+6806=17974), sienge (270+0+24=294), gestao-comercial
   * (16+0+69=85) e sienge-bulk.
   *
   * Por isso existem casos com `falhas: 0` e `falhas_upstream: 30` — chamadas
   * que não concluíram, nenhuma por defeito próprio. A guarda antiga saía em
   * `if (!saude.falhas) return false` e ficava cega justamente neles.
   */
  it("aponta quando a culpa é do outro lado", () => {
    // 20 não concluíram; 18 delas de fora
    expect(culpaDeTerceiro({ execs: 100, ok: 80, falhas: 2, falhas_upstream: 18, ultima: null })).toBe(true);
    // 20 não concluíram; só 2 de fora
    expect(culpaDeTerceiro({ execs: 100, ok: 80, falhas: 18, falhas_upstream: 2, ultima: null })).toBe(false);
    // o caso do Sienge: nenhuma falha própria, e 100% de fora
    expect(culpaDeTerceiro({ execs: 294, ok: 270, falhas: 0, falhas_upstream: 24, ultima: null })).toBe(true);
    // tudo concluiu: não há culpa de ninguém
    expect(culpaDeTerceiro({ execs: 39, ok: 39, falhas: 0, falhas_upstream: 0, ultima: null })).toBe(false);
  });
});

describe("frequência de viagens", () => {
  it("quem roda mais anda mais", () => {
    const muito = intervaloEntreViagens(1200, 1200);
    const pouco = intervaloEntreViagens(12, 1200);
    expect(muito).toBeLessThan(pouco);
  });

  it("quem não roda nunca levanta", () => {
    expect(intervaloEntreViagens(0, 1200)).toBe(Infinity);
  });

  it("fica dentro da faixa utilizável", () => {
    for (const e of [1, 10, 100, 1000, 50_000]) {
      const s = intervaloEntreViagens(e, 50_000);
      expect(s).toBeGreaterThanOrEqual(6);
      expect(s).toBeLessThanOrEqual(70);
    }
  });
});

/*
 * Os três zeros do HUB.
 *
 * Levantado do `ecossistema-mapa` real em 06/09/2026: dos dezesseis sistemas,
 * três executaram (portfolio 37, viabilidade 7, rh 1), onze têm linha de saúde
 * com `execs: 0`, e dois — `sucesso-cliente` e `captacao` — não têm linha
 * nenhuma. A tela chamava as treze de "sem dados no HUB".
 */
describe("registro ausente e registro zerado são coisas diferentes", () => {
  const semLinha = undefined;
  const linhaZerada = { execs: 0, ok: 0, falhas: 0, ultima: null };

  it("1 · sistema sem linha de saúde é sem-dados", () => {
    expect(estadoDoSistema(semLinha, AGORA)).toBe("sem-dados");
    expect(estadoDoSistema(null, AGORA)).toBe("sem-dados");
    expect(semRegistroNoHub(estadoDoSistema(semLinha, AGORA))).toBe(true);
  });

  it("2 · sistema com linha de saúde e execs = 0 é sem-execucao", () => {
    expect(estadoDoSistema(linhaZerada, AGORA)).toBe("sem-execucao");
    // o HUB TEM medição para ele; a tela não pode alegar ignorância
    expect(semRegistroNoHub(estadoDoSistema(linhaZerada, AGORA))).toBe(false);
  });

  it("3 · com execuções, a lógica de antes continua igual", () => {
    expect(estadoDoSistema({ execs: 37, ok: 37, falhas: 0, ultima: horasAtras(2) }, AGORA))
      .toBe("trabalhando");
    expect(estadoDoSistema({ execs: 7, ok: 7, falhas: 0, ultima: horasAtras(40) }, AGORA))
      .toBe("ocioso");
    expect(estadoDoSistema({ execs: 100, ok: 80, falhas: 20, ultima: horasAtras(1) }, AGORA))
      .toBe("falha");
    // execução registrada sem carimbo de data segue caindo em ocioso
    expect(estadoDoSistema({ execs: 5, ok: 5, falhas: 0, ultima: null }, AGORA)).toBe("ocioso");
  });

  it("4 · sem-execucao nunca vira trabalhando, nem com carimbo recente", () => {
    // linha zerada COM carimbo de hoje: mesmo assim, zero execução é zero
    const zeradoComCarimbo = { execs: 0, ok: 0, falhas: 0, ultima: horasAtras(0.1) };
    expect(estadoDoSistema(zeradoComCarimbo, AGORA)).toBe("sem-execucao");
    expect(estadoDoSistema(linhaZerada, AGORA)).not.toBe("trabalhando");
    // e continua parado na cadeira, como sempre esteve
    expect(estaParado(estadoDoSistema(linhaZerada, AGORA))).toBe(true);
    expect(estaParado(estadoDoSistema(semLinha, AGORA))).toBe(true);
  });

  it("5 · atividade continua vindo só do sinal de atividade, não do estado", () => {
    const ontem = new Date(AGORA - 20 * 3_600_000).toISOString();
    const f = fonteDeRetratos({ x: { execs: 0, ok: 0, falhas: 0, ultima: null } });
    // o retrato seguinte segue zerado: sem-execucao NÃO produz atividade
    f.observar({ x: { execs: 0, ok: 0, falhas: 0, ultima: null } }, AGORA);
    expect([...f.ativos()]).toEqual([]);
    // e a janela de atividade não foi tocada nesta etapa
    expect(JANELA_ATIVIDADE_MS).toBe(120_000);
    // saúde "trabalhando" com execução velha também não é atividade
    const g = fonteDeRetratos({ y: { execs: 100, ok: 100, falhas: 0, ultima: ontem } });
    g.observar({ y: { execs: 100, ok: 100, falhas: 0, ultima: ontem } }, AGORA);
    expect(estadoDoSistema({ execs: 100, ok: 100, falhas: 0, ultima: ontem }, AGORA))
      .toBe("trabalhando");
    expect([...g.ativos()]).toEqual([]);
  });

  it("6 · saúde e atividade seguem independentes nos quatro cruzamentos", () => {
    const agorinha = new Date(AGORA - 30_000).toISOString();
    // operacional + parado
    const f = fonteDeRetratos({ a: { execs: 50, ok: 50, falhas: 0, ultima: horasAtras(20) } });
    f.observar({ a: { execs: 50, ok: 50, falhas: 0, ultima: horasAtras(20) } }, AGORA);
    expect(estadoDoSistema({ execs: 50, ok: 50, falhas: 0, ultima: horasAtras(20) }, AGORA))
      .toBe("trabalhando");
    expect([...f.ativos()]).toEqual([]);
    // em falha + ativo agora
    const g = fonteDeRetratos({ b: { execs: 100, ok: 50, falhas: 50, ultima: horasAtras(3) } });
    g.observar({ b: { execs: 101, ok: 50, falhas: 51, ultima: agorinha } }, AGORA);
    expect(estadoDoSistema({ execs: 101, ok: 50, falhas: 51, ultima: agorinha }, AGORA))
      .toBe("falha");
    expect([...g.ativos()]).toEqual(["b"]);
  });

  it("8 · a leitura não altera nada do que veio do HUB", () => {
    const original = { execs: 0, ok: 0, falhas: 0, ultima: null };
    const copia = { ...original };
    estadoDoSistema(original, AGORA);
    estaParado(estadoDoSistema(original, AGORA));
    semRegistroNoHub(estadoDoSistema(original, AGORA));
    expect(original).toEqual(copia);
  });
});

/*
 * O retrato real, copiado da resposta de `ecossistema-mapa` em 06/09/2026.
 * Não é dado inventado: é o que o HUB devolveu, com os números que devolveu.
 * Serve para provar que o rodapé passa a dizer 11 + 2 no lugar de 13.
 */
const RETRATO_HUB: Record<string, { execs: number; ok: number; falhas: number; ultima: string | null }> = {
  portfolio: { execs: 37, ok: 37, falhas: 0, ultima: "2026-09-06T09:00:05.017274+00:00" },
  viabilidade: { execs: 7, ok: 7, falhas: 0, ultima: "2026-09-04T18:06:01.910302+00:00" },
  rh: { execs: 1, ok: 1, falhas: 0, ultima: "2026-09-04T15:44:40.59329+00:00" },
  "gestao-comercial": { execs: 0, ok: 0, falhas: 0, ultima: null },
  locacao: { execs: 0, ok: 0, falhas: 0, ultima: null },
  "crm-house": { execs: 0, ok: 0, falhas: 0, ultima: null },
  processos: { execs: 0, ok: 0, falhas: 0, ultima: null },
  "fluxo-caixa": { execs: 0, ok: 0, falhas: 0, ultima: null },
  "nakhon-contratos": { execs: 0, ok: 0, falhas: 0, ultima: null },
  incorporacao: { execs: 0, ok: 0, falhas: 0, ultima: null },
  produtividade: { execs: 0, ok: 0, falhas: 0, ultima: null },
  atividades: { execs: 0, ok: 0, falhas: 0, ultima: null },
  automacoes: { execs: 0, ok: 0, falhas: 0, ultima: null },
  "desenvolvimento-produto": { execs: 0, ok: 0, falhas: 0, ultima: null },
  // sucesso-cliente e captacao não aparecem: o HUB não manda linha para eles
};
const DEZESSEIS = [
  "gestao-comercial", "locacao", "crm-house", "processos", "rh", "fluxo-caixa",
  "nakhon-contratos", "viabilidade", "incorporacao", "portfolio", "produtividade",
  "sucesso-cliente", "atividades", "automacoes", "desenvolvimento-produto", "captacao",
].map((id) => ({ id }));

describe("7 · o resumo da página separa os dois zeros", () => {
  // 06/09/2026 12:00Z: portfolio executou às 09:00 (dentro das 24 h), os
  // outros dois em 04/09 (fora).
  const NAQUELE_DIA = Date.parse("2026-09-06T12:00:00Z");

  it("os dezesseis sistemas reais caem 3 / 11 / 2", () => {
    const r = resumoDeEstados(DEZESSEIS, RETRATO_HUB, NAQUELE_DIA);
    expect(r.semExecucao, "linha existe e diz zero").toBe(11);
    expect(r.semDados, "sem linha nenhuma no HUB").toBe(2);
    expect(r.trabalhando + r.ocioso + r.falha, "com execução").toBe(3);
    // o total continua fechando em dezesseis
    expect(r.trabalhando + r.ocioso + r.falha + r.semExecucao + r.semDados).toBe(16);
  });

  it("o número que a tela mostrava — 13 — era a soma de duas coisas", () => {
    const r = resumoDeEstados(DEZESSEIS, RETRATO_HUB, NAQUELE_DIA);
    expect(r.semExecucao + r.semDados).toBe(13);
    // e nenhum dos dois sozinho vale 13: é isso que a tela precisa parar de dizer
    expect(r.semDados).not.toBe(13);
  });

  it("cada sistema recebe o estado dele, não o do grupo", () => {
    const porEstado = new Map<string, string>();
    for (const { id } of DEZESSEIS) porEstado.set(id, estadoDoSistema(RETRATO_HUB[id], NAQUELE_DIA));
    expect(porEstado.get("portfolio")).toBe("trabalhando");
    expect(porEstado.get("viabilidade")).toBe("ocioso");
    expect(porEstado.get("rh")).toBe("ocioso");
    expect(porEstado.get("automacoes")).toBe("sem-execucao");
    expect(porEstado.get("sucesso-cliente")).toBe("sem-dados");
    expect(porEstado.get("captacao")).toBe("sem-dados");
  });
});

/*
 * Os treze serviços de fora, como o `ecossistema-mapa` devolveu em 07/09/2026.
 *
 * O painel lateral mostrava todos eles com a mesma bolinha cinza fixa: depois
 * de toda a separação de estados, a lista nao dizia que o autentique esta
 * falhando com 1.483 erros. Agora ela usa `estadoDoSistema` e este resumo —
 * os mesmos do mapa e do rodapé.
 */
const CONECTORES_HUB: Record<string, { execs: number; ok: number; falhas: number; falhas_upstream?: number; ultima: string | null }> = {
  autentique: { execs: 17974, ok: 9685, falhas: 1483, falhas_upstream: 6806, ultima: "2026-09-05T00:22:33.806009+00:00" },
  sienge: { execs: 387, ok: 357, falhas: 0, falhas_upstream: 30, ultima: "2026-09-06T09:00:44.271207+00:00" },
  "sienge-bulk": { execs: 154, ok: 125, falhas: 0, falhas_upstream: 29, ultima: "2026-09-06T09:00:45.483311+00:00" },
  email: { execs: 46, ok: 46, falhas: 0, ultima: "2026-09-06T11:00:11.453265+00:00" },
  "lovable-ai": { execs: 4, ok: 0, falhas: 0, falhas_upstream: 4, ultima: "2026-08-29T14:31:30.050624+00:00" },
  orulo: { execs: 0, ok: 0, falhas: 0, ultima: null },
  sympla: { execs: 0, ok: 0, falhas: 0, ultima: null },
  n8n: { execs: 0, ok: 0, falhas: 0, ultima: null },
  uazapi: { execs: 0, ok: 0, falhas: 0, ultima: null },
  cnpj: { execs: 0, ok: 0, falhas: 0, ultima: null },
  busca: { execs: 0, ok: 0, falhas: 0, ultima: null },
  "google-drive": { execs: 0, ok: 0, falhas: 0, ultima: null },
  prevision: { execs: 0, ok: 0, falhas: 0, ultima: null },
};
const TREZE = Object.keys(CONECTORES_HUB).map((id) => ({ id }));

describe("os serviços de fora carregam o mesmo estado das mesas", () => {
  // 06/09 12:00Z: sienge, sienge-bulk e email executaram nas ultimas 24 h.
  const NAQUELE_DIA = Date.parse("2026-09-06T12:00:00Z");

  it("autentique aparece em falha, não como um cinza qualquer", () => {
    const e = estadoDoSistema(CONECTORES_HUB.autentique, NAQUELE_DIA);
    expect(e).toBe("falha");
    // e a culpa é majoritariamente de terceiro: 6.806 de 1.483+ upstream
    expect(culpaDeTerceiro(CONECTORES_HUB.autentique)).toBe(true);
  });

  /*
   * ESTES TRÊS MUDARAM DE ESTADO quando a taxa passou a somar as falhas de
   * terceiro, e a mudança é o próprio motivo da regra nova:
   *
   *   sienge       30 de 387 chamadas não concluíram  ( 7,8%)
   *   sienge-bulk  29 de 154                          (18,8%)
   *   lovable-ai    4 de   4                          ( 100%)
   *
   * Todos os três apareciam como saudáveis porque `falhas` próprias era zero —
   * o HUB atribuía tudo a upstream. Para quem olha o andar, a chamada não
   * chegou; de quem é a culpa é o que o balão diz, não o estado.
   */
  it("conector cujas chamadas não concluem aparece em falha, mesmo sem falha própria", () => {
    expect(estadoDoSistema(CONECTORES_HUB.sienge, NAQUELE_DIA)).toBe("falha");
    expect(CONECTORES_HUB.sienge.falhas).toBe(0); // nenhuma falha PRÓPRIA
    expect(culpaDeTerceiro(CONECTORES_HUB.sienge)).toBe(true); // e a fala vai dizer isso

    expect(estadoDoSistema(CONECTORES_HUB["sienge-bulk"], NAQUELE_DIA)).toBe("falha");
    expect(estadoDoSistema(CONECTORES_HUB["lovable-ai"], NAQUELE_DIA)).toBe("falha");
  });

  it("conector com todas as chamadas concluídas segue trabalhando", () => {
    // e-mail: 46 execuções, 46 ok, nenhuma falha de nenhum tipo
    expect(estadoDoSistema(CONECTORES_HUB.email, NAQUELE_DIA)).toBe("trabalhando");
    expect(naoConcluiu(CONECTORES_HUB.email)).toBe(0);
  });

  it("os oito sem execução em 30 dias são sem-execucao, não sem-dados", () => {
    const semExec = ["orulo", "sympla", "n8n", "uazapi", "cnpj", "busca", "google-drive", "prevision"];
    for (const id of semExec) {
      expect(estadoDoSistema(CONECTORES_HUB[id], NAQUELE_DIA), id).toBe("sem-execucao");
    }
    expect(semExec).toHaveLength(8);
  });

  it("nenhum dos treze conectores está sem registro no HUB", () => {
    // Diferente dos sistemas, onde sucesso-cliente e captacao não têm linha.
    const semLinha = TREZE.filter(({ id }) => CONECTORES_HUB[id] === undefined);
    expect(semLinha).toEqual([]);
    expect(TREZE.every(({ id }) => !semRegistroNoHub(estadoDoSistema(CONECTORES_HUB[id], NAQUELE_DIA))))
      .toBe(true);
  });

  it("o resumo do cabeçalho sai da mesma função do rodapé", () => {
    const r = resumoDeEstados(TREZE, CONECTORES_HUB, NAQUELE_DIA);
    // Era { trabalhando: 3, ocioso: 1, falha: 1 }. Somar as falhas de terceiro
    // moveu sienge, sienge-bulk e lovable-ai para falha — 63 chamadas que não
    // concluíram e apareciam como saudáveis.
    expect(r).toEqual({ trabalhando: 1, ocioso: 0, falha: 4, semExecucao: 8, semDados: 0 });
    // "Serviços de fora · 1 em falha · 3 trabalhando · 1 ocioso · 8 sem execução"
    expect(r.trabalhando + r.ocioso + r.falha + r.semExecucao + r.semDados).toBe(13);
  });
});
