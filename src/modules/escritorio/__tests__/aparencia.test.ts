import { describe, expect, it } from "vitest";
import {
  ACESSORIO_POR_CONECTOR,
  ACESSORIO_POR_SISTEMA,
  aparenciaDeConector,
  aparenciaDoSistema,
  hash,
  mapaDeCascos,
  portaSemUso,
  tom,
} from "../aparencia";
import { CONECTORES_EXTERNOS_SEED, SISTEMAS_SEED } from "@/lib/ecossistemaSeed";
import { HUMOR, MONITOR } from "../EscritorioCanvas";
import { corDaPlaca, corDoTraco } from "../sprites";
import type { Estado } from "../estado";

/** Os 16 sistemas que o HUB devolve hoje. */
const SISTEMAS_HUB = [
  "gestao-comercial", "locacao", "crm-house", "processos", "rh", "fluxo-caixa",
  "nakhon-contratos", "viabilidade", "incorporacao", "portfolio", "produtividade",
  "sucesso-cliente", "atividades", "automacoes", "desenvolvimento-produto", "captacao",
];

describe("aparência do BLINK", () => {
  it("é estável: o mesmo id devolve sempre o mesmo casco e acessório", () => {
    expect(aparenciaDoSistema("fluxo-caixa")).toEqual(aparenciaDoSistema("fluxo-caixa"));
  });

  it("todo sistema do HUB tem acessório escolhido à mão, não sorteado", () => {
    for (const id of SISTEMAS_HUB) {
      expect(ACESSORIO_POR_SISTEMA[id], `${id} sem acessório definido`).toBeTruthy();
    }
  });

  it("nenhum sistema do HUB repete o acessório de outro", () => {
    const usados = SISTEMAS_HUB.map((id) => ACESSORIO_POR_SISTEMA[id]);
    expect(new Set(usados).size).toBe(SISTEMAS_HUB.length);
  });

  it("sistema desconhecido ainda ganha um acessório, nunca vazio", () => {
    for (let i = 0; i < 300; i++) {
      const a = aparenciaDoSistema(`sistema-que-nao-existe-${i}`);
      expect(a.acessorio).toBeTruthy();
      expect(a.acessorio).not.toBe("nenhum");
      expect(a.casco).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("nunca devolve cor indefinida — o hash não pode virar índice negativo", () => {
    // `h >> 7` em vez de `h >>> 7` produz índice negativo e a paleta some.
    const ids = [
      ...SISTEMAS_HUB,
      ...SISTEMAS_SEED.map((s) => s.id),
      ...CONECTORES_EXTERNOS_SEED.map((c) => c.id),
      ...Array.from({ length: 500 }, (_, i) => `x-${i}`),
    ];
    for (const id of ids) {
      expect(aparenciaDoSistema(id).casco, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(aparenciaDeConector(id).casco, id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("nenhum símbolo de fora se confunde com acessório de sistema de dentro", () => {
    const dentro = new Set(SISTEMAS_HUB.map((id) => aparenciaDoSistema(id).acessorio));
    const fora = Object.values(ACESSORIO_POR_CONECTOR);
    for (const s of fora) expect(dentro.has(s), `${s} usado dos dois lados`).toBe(false);
  });

  it("hash é sempre positivo", () => {
    for (let i = 0; i < 300; i++) expect(hash(`x${i}`)).toBeGreaterThanOrEqual(0);
  });

  it("tom satura em 255 em vez de estourar o hex", () => {
    expect(tom("#f0f0f0", 2)).toBe("#ffffff");
    expect(tom("#804020", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("roupa e símbolo de quem é de fora", () => {
  const CONECTORES_HUB = [
    "orulo", "sympla", "n8n", "uazapi", "sienge", "sienge-bulk", "email",
    "lovable-ai", "cnpj", "busca", "google-drive", "prevision", "autentique",
  ];

  it("dois sistemas nunca vestem a mesma cor", () => {
    const mapa = mapaDeCascos(SISTEMAS_HUB);
    expect(mapa.size).toBe(SISTEMAS_HUB.length);
    expect(new Set(mapa.values()).size).toBe(SISTEMAS_HUB.length);
  });

  it("a distribuição de cores é estável entre execuções", () => {
    expect([...mapaDeCascos(SISTEMAS_HUB)]).toEqual([...mapaDeCascos([...SISTEMAS_HUB].reverse())]);
  });

  it("aguenta mais sistemas do que a paleta sem devolver cor vazia", () => {
    const muitos = Array.from({ length: 40 }, (_, i) => `s${i}`);
    const mapa = mapaDeCascos(muitos);
    expect(mapa.size).toBe(40);
    for (const cor of mapa.values()) expect(cor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("cada serviço de fora carrega um símbolo próprio, nenhum genérico", () => {
    const simbolos = CONECTORES_HUB.map((id) => ACESSORIO_POR_CONECTOR[id]);
    for (const [i, s] of simbolos.entries()) {
      expect(s, `${CONECTORES_HUB[i]} sem símbolo`).toBeTruthy();
      expect(s).not.toBe("caixa");
    }
    expect(new Set(simbolos).size).toBe(CONECTORES_HUB.length);
  });

  it("serviço desconhecido cai na caixa de entrega, não em nada", () => {
    expect(aparenciaDeConector("servico-novo").acessorio).toBe("caixa");
  });
});

describe("porta de serviço sem integração", () => {
  const integracoes = [{ origem: "sienge" }, { origem: "n8n" }, { origem: "rh" }];

  it("acende a porta de quem tem integração saindo", () => {
    expect(portaSemUso("sienge", integracoes)).toBe(false);
    expect(portaSemUso("n8n", integracoes)).toBe(false);
  });

  it("apaga a porta de quem o HUB não registra — hoje, Órulo e Sympla", () => {
    expect(portaSemUso("orulo", integracoes)).toBe(true);
    expect(portaSemUso("sympla", integracoes)).toBe(true);
  });

  it("ser destino não acende a porta: quem entrega é a origem", () => {
    expect(portaSemUso("email", [{ origem: "rh" }])).toBe(true);
  });
});

describe("marcas dos serviços de fora", () => {
  it("só usa marca onde ela lê em pixel art", () => {
    // Autentique e Prevision voltaram ao símbolo do ofício: o "a" virava
    // gráfico de barras e as três setas viravam pontinhos.
    expect(ACESSORIO_POR_CONECTOR.sienge).toBe("marcaSienge");
    expect(ACESSORIO_POR_CONECTOR.orulo).toBe("marcaOrulo");
    expect(ACESSORIO_POR_CONECTOR.sympla).toBe("marcaSympla");
    expect(ACESSORIO_POR_CONECTOR.email).toBe("marcaResend");
    expect(ACESSORIO_POR_CONECTOR.autentique).toBe("canetaAssina");
    expect(ACESSORIO_POR_CONECTOR.prevision).toBe("cronograma");
  });

  it("continua sem nenhum símbolo repetido entre os serviços", () => {
    const usados = Object.values(ACESSORIO_POR_CONECTOR);
    expect(new Set(usados).size).toBe(usados.length);
  });
});

/*
 * A queixa que originou esta regra: "a tela não pode transformar quatro
 * situações diferentes em praticamente a mesma coisa". Aqui isso vira teste.
 */
describe("cada estado tem uma aparência própria", () => {
  const ESTADOS: Estado[] = ["trabalhando", "ocioso", "falha", "sem-execucao", "sem-dados"];

  it("nenhum par de estados desenha o mesmo BLINK com o mesmo monitor", () => {
    const vistos = new Map<string, Estado>();
    for (const e of ESTADOS) {
      const assinatura = `${HUMOR[e]}+${MONITOR[e]}`;
      expect(vistos.has(assinatura), `${e} desenha igual a ${vistos.get(assinatura)}`).toBe(false);
      vistos.set(assinatura, e);
    }
    expect(vistos.size).toBe(ESTADOS.length);
  });

  it("ocioso e sem-execucao têm o mesmo BLINK, e é o monitor que os separa", () => {
    expect(HUMOR["sem-execucao"]).toBe(HUMOR.ocioso);
    expect(MONITOR["sem-execucao"]).not.toBe(MONITOR.ocioso);
    // o BLINK responde "o HUB conhece?", e para os dois a resposta é sim
    expect(HUMOR["sem-execucao"]).not.toBe(HUMOR["sem-dados"]);
  });

  it("sem-execucao não usa nenhum sinal reservado a problema", () => {
    expect(HUMOR["sem-execucao"]).not.toBe("falha");
    expect(MONITOR["sem-execucao"]).not.toBe(MONITOR.falha);
    // nem é confundido com atividade
    expect(HUMOR["sem-execucao"]).not.toBe("trabalhando");
    expect(MONITOR["sem-execucao"]).not.toBe(MONITOR.trabalhando);
  });
});

/*
 * O BLINK SENTADO ESTÁ DE COSTAS — e o rosto era onde o estado morava.
 *
 * Sentar, na perspectiva do andar, obriga a virar de costas: o monitor está
 * acima do personagem, e quem trabalha olhando para a câmera não está olhando
 * para o monitor. Só que a maioria do andar está sentada a maior parte do
 * tempo, e o rosto é o que responde "o HUB conhece este sistema?".
 *
 * O risco concreto, medido: `sem-execucao` e `sem-dados` usam o MESMO monitor
 * apagado — está travado no teste acima. Se o rosto sai de cena e nada o
 * substitui, os dois estados viram o mesmo boneco preto e a distinção some
 * exatamente em quem está sentado.
 *
 * A faixa da nuca existe por isso, e estes testes são a razão dela.
 */
describe("de costas, o estado continua legível", () => {
  const ESTADOS: Estado[] = ["trabalhando", "ocioso", "falha", "sem-execucao", "sem-dados"];
  /** A cor que a nuca mostra para um estado do andar. */
  const faixa = (e: Estado) => corDoTraco(HUMOR[e]);

  it("sem-execucao e sem-dados NÃO podem mostrar a mesma faixa", () => {
    // É o par que compartilha o monitor: sem a faixa, nada os separaria.
    expect(MONITOR["sem-execucao"]).toBe(MONITOR["sem-dados"]);
    expect(faixa("sem-execucao")).not.toBe(faixa("sem-dados"));
  });

  it("a faixa distingue pelo menos três situações do andar", () => {
    expect(new Set(ESTADOS.map(faixa)).size).toBeGreaterThanOrEqual(3);
  });

  it("quem não tem dado é o único que não mostra amarelo", () => {
    // O amarelo é a marca do BLINK aceso. "Sem dado" é ausência, não humor.
    for (const e of ESTADOS) {
      if (e === "sem-dados") expect(faixa(e)).not.toBe(corDaPlaca("trabalhando"));
      else expect(faixa(e)).not.toBe(corDoTraco("sem-dados"));
    }
  });

  it("a placa do rosto só apaga em sem-dados, e é por isso que a nuca usa o traço", () => {
    // Se a nuca usasse a cor da PLACA, ocioso e trabalhando ficariam iguais de
    // costas — a placa não muda entre eles. O traço muda.
    expect(corDaPlaca("ocioso")).toBe(corDaPlaca("trabalhando"));
    expect(corDoTraco("ocioso")).not.toBe(corDoTraco("trabalhando"));
  });
});
