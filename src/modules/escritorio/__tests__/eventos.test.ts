import { describe, expect, it } from "vitest";
import {
  atividadePorNo,
  portaAtiva,
  JANELA_DE_PORTA_MS,
  agruparExecucoes,
  criarFilaDeEventos,
  fonteDeDemandas,
  fonteDeRetratos,
  PRIORIDADE,
  type Retrato,
} from "../eventos";
import { estadoDoSistema } from "../estado";

const AGORA = Date.parse("2026-09-06T20:00:00Z");
const recente = new Date(AGORA - 3_600_000).toISOString();
const antigo = new Date(AGORA - 10 * 86_400_000).toISOString();

const saudavel = { execs: 1000, ok: 1000, falhas: 0, ultima: recente };
const comFalha = { execs: 1000, ok: 800, falhas: 200, ultima: recente };
const semDado = { execs: 0, ok: 0, falhas: 0, ultima: null };

describe("diff entre retratos", () => {
  it("normal → falha gera evento de entrada em falha", () => {
    const fonte = fonteDeRetratos({ rh: saudavel });
    const eventos = fonte.observar({ rh: comFalha }, AGORA);
    expect(eventos).toHaveLength(1);
    expect(eventos[0].tipo).toBe("entrou_em_falha");
    expect(eventos[0].sistema).toBe("rh");
  });

  it("retrato idêntico não inventa acontecimento nenhum", () => {
    const fonte = fonteDeRetratos({ rh: saudavel, financeiro: saudavel });
    expect(fonte.observar({ rh: saudavel, financeiro: saudavel }, AGORA)).toEqual([]);
  });

  it("falha que continua não gera evento novo a cada retrato", () => {
    const fonte = fonteDeRetratos({ rh: saudavel });
    expect(fonte.observar({ rh: comFalha }, AGORA)).toHaveLength(1);
    // o problema segue, e o contador de falhas cresce: ainda assim, silêncio
    const piorou = { ...comFalha, execs: 1200, ok: 900, falhas: 300 };
    expect(fonte.observar({ rh: piorou }, AGORA + 60_000)).toEqual([]);
    expect(fonte.pendentes()).toEqual(["rh"]);
  });

  it("falha → normal gera recuperação e fecha o pendente", () => {
    const fonte = fonteDeRetratos({ rh: saudavel });
    fonte.observar({ rh: comFalha }, AGORA);
    const eventos = fonte.observar({ rh: saudavel }, AGORA + 120_000);
    expect(eventos.map((e) => e.tipo)).toContain("recuperado");
    expect(fonte.pendentes()).toEqual([]);
  });

  it("sistema que volta a reportar depois de calado vira evento", () => {
    const fonte = fonteDeRetratos({ rh: { ...semDado } });
    const eventos = fonte.observar({ rh: { execs: 5, ok: 5, falhas: 0, ultima: recente } }, AGORA);
    expect(eventos.map((e) => e.tipo)).toContain("comecou_a_executar");
  });

  it("sistema novo no catálogo não vira evento: não dá para saber se mudou", () => {
    const fonte = fonteDeRetratos({});
    expect(fonte.observar({ rh: comFalha }, AGORA)).toEqual([]);
  });

  it("falha majoritariamente de terceiro marca o contexto, sem dizer qual", () => {
    const fonte = fonteDeRetratos({ rh: saudavel });
    const eventos = fonte.observar(
      { rh: { execs: 1000, ok: 800, falhas: 200, falhas_upstream: 180, ultima: recente } },
      AGORA,
    );
    expect(eventos[0].contexto).toBe("upstream");
    // o retrato não diz QUAL serviço; o campo não pode ser preenchido
    expect(eventos[0].integracao).toBeUndefined();
  });

  it("sistema parado há dias não é confundido com falha", () => {
    const parado: Retrato = { rh: { execs: 40, ok: 40, falhas: 0, ultima: antigo } };
    const fonte = fonteDeRetratos(parado);
    expect(fonte.observar(parado, AGORA)).toEqual([]);
  });
});

describe("fila de eventos", () => {
  const par = { origem: "rh", destino: "automacoes" };
  const sempre = () => par;

  it("entrega o evento mais urgente primeiro", () => {
    const fila = criarFilaDeEventos();
    fila.registrar(
      [
        { id: "a", tipo: "comecou_a_executar", sistema: "x", timestamp: 0, prioridade: PRIORIDADE.comecou_a_executar },
        { id: "b", tipo: "entrou_em_falha", sistema: "rh", timestamp: 0, prioridade: PRIORIDADE.entrou_em_falha },
      ],
      0,
    );
    expect(fila.proximo(0, sempre)?.evento.tipo).toBe("entrou_em_falha");
  });

  it("o mesmo evento não é enfileirado duas vezes", () => {
    const fila = criarFilaDeEventos();
    const e = { id: "x1", tipo: "entrou_em_falha" as const, sistema: "rh", timestamp: 0, prioridade: 1 };
    fila.registrar([e], 0);
    fila.registrar([e], 0);
    expect(fila.tamanho()).toBe(1);
  });

  it("cooldown impede o mesmo aviso em sequência", () => {
    const fila = criarFilaDeEventos({ evento: 100, par: 100, relacao: 100 });
    fila.registrar([{ id: "1", tipo: "entrou_em_falha", sistema: "rh", timestamp: 0, prioridade: 1 }], 0);
    const primeiro = fila.proximo(0, sempre)!;
    fila.confirmar(primeiro.evento, primeiro.par, 0);

    fila.registrar([{ id: "2", tipo: "entrou_em_falha", sistema: "rh", timestamp: 10, prioridade: 1 }], 10);
    expect(fila.proximo(10, sempre)).toBeNull();
    expect(fila.proximo(200, sempre)).not.toBeNull();
  });

  it("evento sem destino possível fica na fila em vez de sumir", () => {
    const fila = criarFilaDeEventos();
    fila.registrar([{ id: "1", tipo: "entrou_em_falha", sistema: "rh", timestamp: 0, prioridade: 1 }], 0);
    expect(fila.proximo(0, () => null)).toBeNull();
    expect(fila.tamanho()).toBe(1);
  });

  it("evento velho demais é descartado", () => {
    const fila = criarFilaDeEventos();
    fila.registrar([{ id: "1", tipo: "entrou_em_falha", sistema: "rh", timestamp: 0, prioridade: 1 }], 0);
    fila.registrar([], 60 * 60);
    expect(fila.tamanho()).toBe(0);
  });
});

describe("atividade não é a mesma coisa que saúde", () => {
  const agora = AGORA;
  const ontem = new Date(agora - 20 * 3_600_000).toISOString();
  const agorinha = new Date(agora - 30_000).toISOString();

  it("executar nas últimas 24 h não conta como executar agora", () => {
    const f = fonteDeRetratos({ n8n: { execs: 100, ok: 100, falhas: 0, ultima: ontem } });
    f.observar({ n8n: { execs: 100, ok: 100, falhas: 0, ultima: ontem } }, agora);
    // a saúde diz "trabalhando"; a atividade diz que não rodou nada agora
    expect(estadoDoSistema({ execs: 100, ok: 100, falhas: 0, ultima: ontem }, agora)).toBe("trabalhando");
    expect([...f.ativos()]).toEqual([]);
  });

  it("execução dentro da janela conta como atividade", () => {
    const f = fonteDeRetratos({ n8n: { execs: 100, ok: 100, falhas: 0, ultima: ontem } });
    f.observar({ n8n: { execs: 101, ok: 101, falhas: 0, ultima: agorinha } }, agora);
    expect([...f.ativos()]).toEqual(["n8n"]);
  });

  it("o carimbo avançar entre duas leituras também conta", () => {
    const meiaHora = new Date(agora - 1_800_000).toISOString();
    const f = fonteDeRetratos({ n8n: { execs: 100, ok: 100, falhas: 0, ultima: ontem } });
    f.observar({ n8n: { execs: 101, ok: 101, falhas: 0, ultima: meiaHora } }, agora);
    expect([...f.ativos()]).toEqual(["n8n"]);
  });

  it("sem carimbo nenhum, não há atividade", () => {
    const f = fonteDeRetratos({ n8n: { execs: 0, ok: 0, falhas: 0, ultima: null } });
    f.observar({ n8n: { execs: 0, ok: 0, falhas: 0, ultima: null } }, agora);
    expect([...f.ativos()]).toEqual([]);
  });
});

describe("demandas viram evento sem inventar dono", () => {
  const KANBAN = "automacoes";

  it("a primeira leitura não dispara o Kanban inteiro", () => {
    const f = fonteDeDemandas(KANBAN);
    expect(f.observar([{ id: "1", status: "a_fazer" }, { id: "2", status: "backlog" }], AGORA)).toEqual([]);
  });

  it("demanda nova gera evento", () => {
    const f = fonteDeDemandas(KANBAN, [{ id: "1", status: "a_fazer" }]);
    const ev = f.observar([{ id: "1", status: "a_fazer" }, { id: "2", status: "backlog" }], AGORA);
    expect(ev.map((e) => e.tipo)).toEqual(["demanda_nova"]);
  });

  it("mudança de etapa gera avanço, e conclusão gera conclusão", () => {
    const f = fonteDeDemandas(KANBAN, [{ id: "1", status: "a_fazer" }]);
    expect(f.observar([{ id: "1", status: "em_desenvolvimento" }], AGORA).map((e) => e.tipo))
      .toEqual(["demanda_avancou"]);
    expect(f.observar([{ id: "1", status: "concluido" }], AGORA).map((e) => e.tipo))
      .toEqual(["demanda_concluida"]);
  });

  it("Kanban parado não gera evento nenhum", () => {
    const lista = [{ id: "1", status: "em_testes" }];
    const f = fonteDeDemandas(KANBAN, lista);
    expect(f.observar(lista, AGORA)).toEqual([]);
    expect(f.observar(lista, AGORA + 60_000)).toEqual([]);
  });

  it("o evento é endereçado ao responsável VISUAL, não a um dono inventado", () => {
    const f = fonteDeDemandas(KANBAN, [{ id: "1", status: "a_fazer" }]);
    const ev = f.observar([{ id: "1", status: "em_desenvolvimento" }], AGORA);
    expect(ev[0].sistema).toBe(KANBAN);
    // nada da demanda vaza para o evento além do id na chave de deduplicação
    expect(Object.keys(ev[0]).sort()).toEqual(["id", "prioridade", "sistema", "timestamp", "tipo"]);
  });

  it("só as etapas de trabalho contam como trabalho", () => {
    const f = fonteDeDemandas(KANBAN);
    f.observar(
      [
        { id: "1", status: "backlog" },
        { id: "2", status: "a_fazer" },
        { id: "3", status: "em_desenvolvimento" },
        { id: "4", status: "em_testes" },
        { id: "5", status: "homologacao" },
        { id: "6", status: "concluido" },
      ],
      AGORA,
    );
    expect(f.emTrabalho()).toBe(3);
  });

  it("demanda concluída encerra o trabalho", () => {
    const f = fonteDeDemandas(KANBAN, [{ id: "1", status: "em_desenvolvimento" }]);
    expect(f.emTrabalho()).toBe(1);
    f.observar([{ id: "1", status: "concluido" }], AGORA);
    expect(f.emTrabalho()).toBe(0);
  });
});

// ===========================================================================
/*
 * A rajada, com o dado real da janela de 09:00 de 08/09/2026:
 *
 *   fluxo-caixa → sienge        35 execuções (3 falhas) em 14 segundos
 *   fluxo-caixa → sienge-bulk    9 execuções
 *   fluxo-caixa → portfolio      1
 *   incorporacao → email         1  (duas horas depois)
 */
describe("agrupamento da rajada de execuções", () => {
  const t = (iso: string) => `2026-09-08T${iso}+00:00`;
  const rajada = [
    ...Array.from({ length: 35 }, (_, i) => ({
      id: `a${i}`,
      created_at: t(`09:00:${String(38 + (i % 14)).padStart(2, "0")}.000`),
      origem: "fluxo-caixa",
      destino: "sienge",
      falhou: i < 3,
    })),
    ...Array.from({ length: 9 }, (_, i) => ({
      id: `b${i}`,
      created_at: t("09:00:08.000"),
      origem: "fluxo-caixa",
      destino: "sienge-bulk",
      falhou: false,
    })),
    { id: "c", created_at: t("09:00:05.000"), origem: "fluxo-caixa", destino: "portfolio", falhou: false },
    { id: "d", created_at: t("11:00:09.000"), origem: "incorporacao", destino: "email", falhou: false },
  ];

  it("35 execuções em 14 segundos viram UMA viagem, com a contagem", () => {
    const eventos = agruparExecucoes(rajada);
    const sienge = eventos.find((e) => e.destino === "sienge")!;
    expect(sienge.execucoes).toBe(35);
    expect(sienge.falhas).toBe(3);
    expect(sienge.sistema).toBe("fluxo-caixa");
    expect(sienge.tipo).toBe("executou");
  });

  it("cada par origem→destino é um evento, não uma soma de tudo", () => {
    const eventos = agruparExecucoes(rajada);
    expect(eventos).toHaveLength(4);
    expect(eventos.map((e) => e.destino).sort()).toEqual([
      "email", "portfolio", "sienge", "sienge-bulk",
    ]);
  });

  /*
   * A INVARIANTE QUE IMPEDE A TELA DE REPETIR PARA SEMPRE.
   *
   * A página relê a mesma janela de 10 minutos a cada 60 s. Se o id mudasse
   * entre leituras, a mesma rajada viraria viagem nova em todo refresh.
   */
  it("reler a mesma janela produz os MESMOS ids", () => {
    const a = agruparExecucoes(rajada).map((e) => e.id);
    const b = agruparExecucoes([...rajada].reverse()).map((e) => e.id);
    expect(a.sort()).toEqual(b.sort());
    expect(a[0]).toMatch(/^executou:[a-z-]+:[a-z-]+:\d+$/);
  });

  it("a fila descarta a rajada relida — nenhuma viagem repetida", () => {
    const fila = criarFilaDeEventos();
    fila.registrar(agruparExecucoes(rajada), 0);
    const antes = fila.tamanho();
    fila.registrar(agruparExecucoes(rajada), 1);
    expect(fila.tamanho()).toBe(antes);
  });

  it("rajada que atravessa o minuto vira dois eventos — foram dois momentos", () => {
    const eventos = agruparExecucoes([
      { id: "1", created_at: t("09:00:59.000"), origem: "rh", destino: "email", falhou: false },
      { id: "2", created_at: t("09:01:01.000"), origem: "rh", destino: "email", falhou: false },
    ]);
    expect(eventos).toHaveLength(2);
    expect(eventos.every((e) => e.execucoes === 1)).toBe(true);
  });

  it("execução sem origem é descartada: é pessoa chamando, não sistema", () => {
    // As 211 linhas de `ator_tipo = 'usuario'` no HUB caem aqui.
    expect(agruparExecucoes([
      { id: "x", created_at: t("09:00:00.000"), origem: null, destino: "sienge", falhou: false },
    ])).toEqual([]);
  });

  it("destino ausente ou igual à origem não vira viagem para lugar nenhum", () => {
    expect(agruparExecucoes([
      { id: "y", created_at: t("09:00:00.000"), origem: "rh", destino: null, falhou: false },
      { id: "z", created_at: t("09:00:00.000"), origem: "rh", destino: "rh", falhou: false },
    ])).toEqual([]);
  });

  it("carimbo inválido não entra", () => {
    expect(agruparExecucoes([
      { id: "w", created_at: "nao-e-data", origem: "rh", destino: "email", falhou: false },
    ])).toEqual([]);
  });

  it("o mais recente vem primeiro: se a fila cortar, perde o mais velho", () => {
    const eventos = agruparExecucoes(rajada);
    expect(eventos[0].destino).toBe("email"); // 11:00, o mais novo
    for (let i = 1; i < eventos.length; i++) {
      expect(eventos[i - 1].timestamp).toBeGreaterThanOrEqual(eventos[i].timestamp);
    }
  });

  it("o carimbo do grupo é o da execução mais recente dele", () => {
    const eventos = agruparExecucoes(rajada);
    const sienge = eventos.find((e) => e.destino === "sienge")!;
    expect(sienge.timestamp).toBe(Date.parse(t("09:00:51.000")));
  });
});

// ===========================================================================
/*
 * As dez execuções da última hora, medidas em 08/09/2026: TODAS com origem
 * nula — pessoas chamando o Autentique, duas por minuto entre 13:27 e 13:31.
 * Nenhuma vira viagem, e todas as dez são atividade real na porta.
 */
describe("atividade na porta, inclusive quando quem chamou foi pessoa", () => {
  const AGORA = Date.parse("2026-09-08T13:32:00Z");
  const reais = [
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      created_at: `2026-09-08T13:${27 + Math.floor(i / 2)}:${i % 2 ? "40" : "10"}.000Z`,
      origem: null,
      destino: "autentique",
      falhou: false,
    })),
  ];

  it("execução por pessoa não vira viagem, mas conta na porta", () => {
    expect(agruparExecucoes(reais)).toEqual([]);
    const a = atividadePorNo(reais).get("autentique")!;
    expect(a.execucoes).toBe(10);
    expect(a.falhas).toBe(0);
  });

  it("o carimbo é o da execução mais recente", () => {
    const a = atividadePorNo(reais).get("autentique")!;
    expect(a.ultimo).toBe(Date.parse("2026-09-08T13:31:40.000Z"));
  });

  it("a porta acende dentro da janela e apaga depois", () => {
    const a = atividadePorNo(reais).get("autentique");
    expect(portaAtiva(a, AGORA)).toBe(true);
    expect(portaAtiva(a, a!.ultimo + JANELA_DE_PORTA_MS - 1)).toBe(true);
    expect(portaAtiva(a, a!.ultimo + JANELA_DE_PORTA_MS + 1)).toBe(false);
  });

  it("nó sem execução nenhuma não acende", () => {
    expect(portaAtiva(atividadePorNo(reais).get("sienge"), AGORA)).toBe(false);
    expect(portaAtiva(undefined, AGORA)).toBe(false);
  });

  it("execução de SISTEMA conta nos dois: viagem e porta", () => {
    // São dois fatos do mesmo registro, não uma escolha entre eles.
    const doSistema = [
      { id: "s1", created_at: "2026-09-08T13:31:00.000Z", origem: "fluxo-caixa", destino: "sienge", falhou: false },
      { id: "s2", created_at: "2026-09-08T13:31:10.000Z", origem: "fluxo-caixa", destino: "sienge", falhou: true },
    ];
    expect(agruparExecucoes(doSistema)).toHaveLength(1);
    const a = atividadePorNo(doSistema).get("sienge")!;
    expect(a.execucoes).toBe(2);
    expect(a.falhas).toBe(1);
  });

  it("destino ausente não entra, e carimbo torto não quebra", () => {
    const m = atividadePorNo([
      { id: "a", created_at: "2026-09-08T13:31:00.000Z", origem: null, destino: null, falhou: false },
      { id: "b", created_at: "torto", origem: null, destino: "sienge", falhou: false },
    ]);
    expect(m.size).toBe(0);
  });
});
