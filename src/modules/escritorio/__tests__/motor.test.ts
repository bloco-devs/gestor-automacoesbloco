import { afterEach, describe, expect, it, vi } from "vitest";
import { montarAndar } from "../layout";
import { criarMotor, digitando } from "../motor";
import { DADOS_SEMENTE, type DadosEscritorio } from "../dados";
import { PERSONAGEM_W, TILE } from "../sprites";
import { INTEGRACOES_SEED, SISTEMAS_SEED } from "@/lib/ecossistemaSeed";
import { FECHOS, REGRAS, dialogoDoRotulo } from "../conversas";

const AGORA = Date.parse("2026-09-05T20:00:00Z");
const recente = new Date(AGORA - 3_600_000).toISOString();
/*
 * Saúde recente NÃO é o mesmo que atividade agora: `recente` (1 h atrás) diz
 * que o serviço está operacional; só `agorinha` justifica ele sair pela porta.
 */
const agorinha = new Date(AGORA - 30_000).toISOString();
const antigo = new Date(AGORA - 10 * 86_400_000).toISOString();

const sistemas = [
  { id: "comercial", nome: "Comercial", grupo: "Comercial" },
  { id: "crm", nome: "CRM", grupo: "Comercial" },
  { id: "financeiro", nome: "Financeiro", grupo: "Financeiro" },
  { id: "parado", nome: "Parado", grupo: "Financeiro" },
];

const dados: DadosEscritorio = {
  fonte: "hub",
  geradoEm: null,
  sistemas,
  conectores: [{ id: "sienge", nome: "Sienge" }],
  integracoes: [
    { origem: "comercial", destino: "financeiro", label: "vendas" },
    { origem: "sienge", destino: "financeiro", label: "títulos" },
    { origem: "parado", destino: "crm", label: "nunca roda" },
  ],
  saude: {
    comercial: { execs: 1200, ok: 1200, falhas: 0, ultima: recente },
    crm: { execs: 300, ok: 300, falhas: 0, ultima: recente },
    financeiro: { execs: 800, ok: 800, falhas: 0, ultima: recente },
    parado: { execs: 40, ok: 40, falhas: 0, ultima: antigo },
    // o serviço externo também precisa de saúde própria: sem execução
    // registrada ele não sai da porta, e é justamente essa a regra
    sienge: { execs: 600, ok: 600, falhas: 0, ultima: agorinha },
  },
};

const andar = montarAndar(dados.sistemas, dados.conectores);

/** Roda o motor por N segundos em passos de 1/30 s. */
function rodar(motor: ReturnType<typeof criarMotor>, segundos: number, demo = false) {
  const passos = Math.round(segundos * 30);
  for (let i = 0; i < passos; i++) motor.atualizar(1 / 30, demo);
}

afterEach(() => vi.restoreAllMocks());

describe("motor do escritório", () => {
  it("começa com todo mundo na mesa e os externos escondidos", () => {
    const m = criarMotor(andar, dados, AGORA);
    expect(m.porId.get("comercial")!.fase).toBe("mesa");
    expect(m.porId.get("sienge")!.fase).toBe("oculto");
    expect(m.viagensAtivas()).toBe(0);
  });

  it("lê o estado de cada um a partir da saúde", () => {
    const m = criarMotor(andar, dados, AGORA);
    expect(m.porId.get("comercial")!.estado).toBe("trabalhando");
    expect(m.porId.get("parado")!.estado).toBe("ocioso");
  });

  it("sistema ocioso nunca levanta da cadeira, mesmo tendo integração", () => {
    const m = criarMotor(andar, dados, AGORA);
    const p = m.porId.get("parado")!;
    rodar(m, 600);
    expect(p.fase).toBe("mesa");
    expect(p.viagem).toBeUndefined();
  });

  it("sistema sem dado nenhum no HUB também nunca levanta", () => {
    const semDado = {
      ...dados,
      saude: { ...dados.saude, comercial: { execs: 0, ok: 0, falhas: 0, ultima: null } },
    } satisfies DadosEscritorio;
    const m = criarMotor(andar, semDado, AGORA);
    const p = m.porId.get("comercial")!;
    expect(p.estado).toBe("sem-dados");
    rodar(m, 600);
    expect(p.fase).toBe("mesa");
  });

  it("quem não tem integração de saída nunca puxa conversa", () => {
    const m = criarMotor(andar, dados, AGORA);
    const puxaram = new Set<string>();
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      for (const c of m.conversas) puxaram.add(c.a.id);
    }
    // "financeiro" só recebe integração; pode ser convidado, nunca convidar
    expect(puxaram.has("financeiro")).toBe(false);
    // ninguém convida o "crm": quem aponta para ele é o "parado", que não anda
    expect(m.porId.get("crm")!.fase).toBe("mesa");
  });

  it("um sistema parado nunca é arrastado para uma conversa", () => {
    const m = criarMotor(andar, dados, AGORA);
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      for (const c of m.conversas) {
        expect(c.a.estado).not.toBe("ocioso");
        expect(c.b.estado).not.toBe("ocioso");
        expect(c.a.estado).not.toBe("sem-dados");
        expect(c.b.estado).not.toBe("sem-dados");
      }
    }
  });

  it("quem tem integração real sai da mesa, conversa e volta para ela", () => {
    const m = criarMotor(andar, dados, AGORA);
    const p = m.porId.get("comercial")!;
    const fases = new Set<string>();
    let falou = false;
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      fases.add(p.fase);
      if (p.fala) falou = true;
    }
    expect(fases.has("indo")).toBe(true);
    expect(fases.has("encarando")).toBe(true);
    expect(falou).toBe(true);
    expect(fases.has("voltando")).toBe(true);

    // termina a viagem em curso antes de conferir onde ele parou
    let guarda = 30 * 300;
    while (p.fase !== "mesa" && guarda-- > 0) m.atualizar(1 / 30, false);
    expect(p.fase).toBe("mesa");
    expect(Math.round(p.x)).toBe(p.mesa!.pessoaX);
    expect(Math.round(p.y)).toBe(p.mesa!.pessoaY);
  });

  it("o serviço de fora só diz o rótulo real da integração", () => {
    const m = criarMotor(andar, dados, AGORA);
    const p = m.porId.get("sienge")!;
    const ditos = new Set<string>();
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      if (p.viagem && p.viagem.label) ditos.add(p.viagem.label);
    }
    expect([...ditos]).toEqual(["títulos"]);
  });

  it("nenhuma fala inventa dado: tudo sai das regras ou do rótulo real", () => {
    const permitidas = new Set<string>(FECHOS);
    for (const r of REGRAS) {
      for (const t of r.trocas) {
        permitidas.add(t.abre);
        permitidas.add(t.responde);
      }
    }
    for (const it of dados.integracoes) {
      const d = dialogoDoRotulo(it.label);
      permitidas.add(d.abre);
      permitidas.add(d.responde);
    }
    const m = criarMotor(andar, dados, AGORA);
    const ditas = new Set<string>();
    for (let i = 0; i < 30 * 900; i++) {
      m.atualizar(1 / 30, false);
      for (const q of m.personagens) if (q.fala) ditas.add(q.fala);
    }
    expect(ditas.size).toBeGreaterThan(0);
    for (const t of ditas) {
      expect(permitidas.has(t), t).toBe(true);
      expect(/\d/.test(t), `fala com número: ${t}`).toBe(false);
    }
  });

  it("o serviço de fora entrega e some de novo pela porta", () => {
    const m = criarMotor(andar, dados, AGORA);
    const p = m.porId.get("sienge")!;
    const fases = new Set<string>();
    for (let i = 0; i < 30 * 900; i++) {
      m.atualizar(1 / 30, false);
      fases.add(p.fase);
    }
    expect(fases.has("indo")).toBe(true);
    let guarda = 30 * 300;
    while (p.fase !== "oculto" && guarda-- > 0) m.atualizar(1 / 30, false);
    expect(p.fase).toBe("oculto");
    expect(p.x).toBe(p.porta!.frenteX);
  });

  it("nunca passa de seis pessoas fora da mesa ao mesmo tempo", () => {
    const muitos = {
      ...dados,
      sistemas: Array.from({ length: 20 }, (_, i) => ({ id: `s${i}`, nome: `S${i}`, grupo: `G${i % 5}` })),
      integracoes: Array.from({ length: 20 }, (_, i) => ({
        origem: `s${i}`,
        destino: `s${(i + 1) % 20}`,
        label: "dados",
      })),
      saude: Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`s${i}`, { execs: 5000, ok: 5000, falhas: 0, ultima: recente }]),
      ),
    } satisfies DadosEscritorio;
    const a = montarAndar(muitos.sistemas, muitos.conectores);
    const m = criarMotor(a, muitos, AGORA);
    let pico = 0;
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, true);
      pico = Math.max(pico, m.viagensAtivas());
    }
    expect(pico).toBeGreaterThan(0);
    expect(pico).toBeLessThanOrEqual(6);
  });

  it("o modo demonstração faz o ocioso andar; sem ele, não", () => {
    const semDemo = criarMotor(andar, dados, AGORA);
    rodar(semDemo, 300);
    expect(semDemo.porId.get("parado")!.fase).toBe("mesa");

    const comDemo = criarMotor(andar, dados, AGORA);
    const p = comDemo.porId.get("parado")!;
    let saiu = false;
    for (let i = 0; i < 30 * 300; i++) {
      comDemo.atualizar(1 / 30, true);
      if (p.fase !== "mesa") saiu = true;
    }
    expect(saiu).toBe(true);
  });
});

/* ---------------------------------------------------- eventos reais --- */

const ecossistema = [
  { id: "rh", nome: "Gestão de RH", grupo: "Pessoas" },
  { id: "automacoes", nome: "Gestor de Automações", grupo: "Tecnologia" },
  { id: "obra", nome: "Gestão de Obra", grupo: "Operação" },
];

const saudavel = { execs: 1000, ok: 1000, falhas: 0, ultima: recente };
const emFalha = { execs: 1000, ok: 700, falhas: 300, ultima: recente };

const dadosEco: DadosEscritorio = {
  fonte: "hub",
  geradoEm: null,
  sistemas: ecossistema,
  conectores: [],
  integracoes: [
    { origem: "rh", destino: "automacoes", label: "colaboradores" },
    { origem: "obra", destino: "automacoes", label: "medições" },
  ],
  saude: { rh: saudavel, automacoes: saudavel, obra: saudavel },
};
const andarEco = montarAndar(dadosEco.sistemas, dadosEco.conectores);

/** Roda até uma conversa nascer, ou desiste. */
function rodarAte(m: ReturnType<typeof criarMotor>, cond: () => boolean, segundos = 120) {
  for (let i = 0; i < segundos * 30 && !cond(); i++) m.atualizar(1 / 30, false);
  return cond();
}

describe("conversa nascida de evento real", () => {
  it("sistema que entra em falha procura o Gestor de Automações", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);

    expect(rodarAte(m, () => m.conversas.length > 0)).toBe(true);
    const c = m.conversas[0];
    expect(c.evento?.tipo).toBe("entrou_em_falha");
    expect(c.evento?.sistema).toBe("rh");
    expect(c.a.id).toBe("rh");
    expect(c.b.id).toBe("automacoes");
  });

  it("vale para qualquer sistema, sem regra especial para o RH", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, obra: emFalha } }, AGORA);
    expect(rodarAte(m, () => m.conversas.length > 0)).toBe(true);
    expect(m.conversas[0].a.id).toBe("obra");
    expect(m.conversas[0].b.id).toBe("automacoes");
  });

  it("sem evento nenhum, ninguém levanta para avisar nada", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados(dadosEco, AGORA); // retrato idêntico
    for (let i = 0; i < 30 * 60; i++) m.atualizar(1 / 30, false);
    expect(m.conversas.filter((c) => c.evento)).toHaveLength(0);
  });

  it("o mesmo problema não vira conversa duas vezes", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    rodarAte(m, () => m.conversas.length > 0);
    const iniciadas = () => m.registros.filter((r) => r.resultado === "iniciada").length;
    const antes = iniciadas();
    // o problema continua nos retratos seguintes
    for (let ciclo = 1; ciclo <= 4; ciclo++) {
      m.atualizarDados(
        { ...dadosEco, saude: { ...dadosEco.saude, rh: { ...emFalha, falhas: 300 + ciclo * 50 } } },
        AGORA + ciclo * 60_000,
      );
      for (let i = 0; i < 30 * 60; i++) m.atualizar(1 / 30, false);
    }
    expect(iniciadas()).toBe(antes);
  });

  it("quando o sistema volta, há uma conversa de recuperação", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    rodarAte(m, () => m.conversas.length > 0);
    for (let i = 0; i < 30 * 90; i++) m.atualizar(1 / 30, false); // deixa terminar

    const eventos = m.atualizarDados(dadosEco, AGORA + 600_000);
    expect(eventos.map((e) => e.tipo)).toContain("recuperado");
    expect(rodarAte(m, () => m.conversas.some((c) => c.evento?.tipo === "recuperado"), 300)).toBe(true);
  });

  it("nenhuma fala de evento contém número ou dado do payload", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    const ditas = new Set<string>();
    for (let i = 0; i < 30 * 300; i++) {
      m.atualizar(1 / 30, false);
      for (const p of m.personagens) if (p.fala) ditas.add(p.fala);
    }
    expect(ditas.size).toBeGreaterThan(0);
    for (const t of ditas) {
      expect(/\d/.test(t), `fala com número: ${t}`).toBe(false);
      expect(t).not.toContain("undefined");
    }
  });
});

describe("o motor sobrevive ao refresh do HUB", () => {
  it("atualizar dados não teleporta ninguém", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    rodarAte(m, () => m.personagens.some((p) => p.fase === "indo"));
    const andando = m.personagens.find((p) => p.fase === "indo")!;
    const antes = { x: andando.x, y: andando.y, fase: andando.fase };

    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA + 60_000);

    expect(andando.x).toBe(antes.x);
    expect(andando.y).toBe(antes.y);
    expect(andando.fase).toBe(antes.fase);
  });

  it("uma conversa em curso não desaparece com o refresh", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    expect(rodarAte(m, () => m.conversas.length > 0)).toBe(true);
    const conversa = m.conversas[0];

    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA + 60_000);

    expect(m.conversas).toContain(conversa);
    expect(conversa.a.conversa).toBe(conversa);
    expect(conversa.b.conversa).toBe(conversa);
  });

  it("o refresh atualiza a saúde de quem está na mesa", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    expect(m.porId.get("obra")!.estado).toBe("trabalhando");
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, obra: emFalha } }, AGORA);
    expect(m.porId.get("obra")!.estado).toBe("falha");
  });
});

/* ------------------------------------- 2A: estado real dos serviços --- */

describe("serviço externo reflete a própria saúde", () => {
  const comConector: DadosEscritorio = {
    ...dadosEco,
    conectores: [{ id: "n8n", nome: "n8n" }, { id: "resend", nome: "Resend" }],
    integracoes: [...dadosEco.integracoes, { origem: "n8n", destino: "automacoes", label: "execuções" }],
    saude: { ...dadosEco.saude },
  };
  const andarComServico = montarAndar(comConector.sistemas, comConector.conectores);

  const comSaude = (saude: DadosEscritorio["saude"]) => ({ ...comConector, saude });

  it("conector que executou dentro da janela aparece trabalhando", () => {
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: saudavel }), AGORA);
    expect(m.porId.get("n8n")!.estado).toBe("trabalhando");
  });

  it("conector sem execução recente fica ocioso, não 'trabalhando' por padrão", () => {
    const parado = { execs: 500, ok: 500, falhas: 0, ultima: antigo };
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: parado }), AGORA);
    expect(m.porId.get("n8n")!.estado).toBe("ocioso");
  });

  it("conector sem dado nenhum não é dado como trabalhando", () => {
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude }), AGORA);
    expect(m.porId.get("resend")!.estado).toBe("sem-dados");
  });

  it("conector com falha acima do limiar aparece em falha", () => {
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: emFalha }), AGORA);
    expect(m.porId.get("n8n")!.estado).toBe("falha");
  });

  it("serviço parado nunca sai pela porta para entregar", () => {
    const parado = { execs: 500, ok: 500, falhas: 0, ultima: antigo };
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: parado }), AGORA);
    const p = m.porId.get("n8n")!;
    for (let i = 0; i < 30 * 900; i++) m.atualizar(1 / 30, false);
    expect(p.fase).toBe("oculto");
    expect(p.viagem).toBeUndefined();
  });

  it("serviço que executou de verdade entrega", () => {
    const executando = { execs: 1000, ok: 1000, falhas: 0, ultima: agorinha };
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: executando }), AGORA);
    const p = m.porId.get("n8n")!;
    const fases = new Set<string>();
    for (let i = 0; i < 30 * 900; i++) {
      m.atualizar(1 / 30, false);
      fases.add(p.fase);
    }
    expect(fases.has("indo")).toBe(true);
  });

  it("o refresh do HUB atualiza o estado do serviço, não só o do sistema", () => {
    const m = criarMotor(andarComServico, comSaude({ ...comConector.saude, n8n: saudavel }), AGORA);
    expect(m.porId.get("n8n")!.estado).toBe("trabalhando");
    m.atualizarDados(comSaude({ ...comConector.saude, n8n: emFalha }), AGORA);
    expect(m.porId.get("n8n")!.estado).toBe("falha");
  });

  it("sistema e serviço têm estados independentes", () => {
    const m = criarMotor(
      andarComServico,
      comSaude({ ...comConector.saude, rh: emFalha, n8n: saudavel }),
      AGORA,
    );
    expect(m.porId.get("rh")!.estado).toBe("falha");
    expect(m.porId.get("n8n")!.estado).toBe("trabalhando");
  });
});

/* ------------------------------------ 2B: coreografia da conversa --- */

describe("coreografia da conversa", () => {
  /** Roda até a condição, devolvendo se chegou lá. */
  const ate = (m: ReturnType<typeof criarMotor>, cond: () => boolean, seg = 240) => {
    for (let i = 0; i < seg * 30 && !cond(); i++) m.atualizar(1 / 30, false);
    return cond();
  };
  const comFalha = () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    return m;
  };

  it("os dois nunca ocupam o mesmo ponto, nem se atravessam na aproximação", () => {
    const m = comFalha();
    expect(ate(m, () => m.conversas.length > 0)).toBe(true);
    const c = m.conversas[0];
    let sobrepos = 0;
    for (let i = 0; i < 30 * 200; i++) {
      m.atualizar(1 / 30, false);
      if (!m.conversas.includes(c)) break;
      const dx = Math.abs(c.a.x - c.b.x);
      const dy = Math.abs(c.a.y - c.b.y);
      if (dx < PERSONAGEM_W && dy < 30) sobrepos++;
    }
    expect(sobrepos).toBe(0);
  });

  it("a distância de conversa continua sendo de dois tiles", () => {
    const m = comFalha();
    expect(ate(m, () => m.conversas[0]?.fase === "encarando")).toBe(true);
    const c = m.conversas[0];
    const dist = Math.hypot(c.a.x - c.b.x, c.a.y - c.b.y);
    expect(dist).toBe(2 * TILE);
    expect(dist).toBeGreaterThan(PERSONAGEM_W);
  });

  it("quem chega primeiro fica aguardando, não congelado sem papel", () => {
    const m = comFalha();
    let viuAguardando = false;
    for (let i = 0; i < 30 * 200; i++) {
      m.atualizar(1 / 30, false);
      const c = m.conversas[0];
      if (c && (c.a.papel === "aguardando" || c.b.papel === "aguardando")) viuAguardando = true;
      if (c?.fase === "falando") break;
    }
    expect(viuAguardando).toBe(true);
  });

  it("o balão não aparece antes dos dois chegarem", () => {
    const m = comFalha();
    for (let i = 0; i < 30 * 200; i++) {
      m.atualizar(1 / 30, false);
      const c = m.conversas[0];
      if (!c) continue;
      if (c.fase === "indo" || c.fase === "encarando") {
        expect(c.a.fala, "balão cedo demais").toBeUndefined();
        expect(c.b.fala, "balão cedo demais").toBeUndefined();
      }
      if (c.fase === "falando") break;
    }
  });

  it("existe encaramento antes da primeira fala", () => {
    const m = comFalha();
    const ordem: string[] = [];
    for (let i = 0; i < 30 * 200; i++) {
      m.atualizar(1 / 30, false);
      const c = m.conversas[0];
      if (c && ordem[ordem.length - 1] !== c.fase) ordem.push(c.fase);
      if (c?.fase === "falando") break;
    }
    expect(ordem.indexOf("encarando")).toBeGreaterThan(-1);
    expect(ordem.indexOf("encarando")).toBeLessThan(ordem.indexOf("falando"));
  });

  it("só um fala por vez, e o outro escuta", () => {
    const m = comFalha();
    ate(m, () => m.conversas[0]?.fase === "falando");
    const c = m.conversas[0];
    const papeis = new Set<string>();
    for (let i = 0; i < 30 * 40; i++) {
      m.atualizar(1 / 30, false);
      if (c.fase !== "falando") break;
      const dois = [c.a.papel, c.b.papel].sort().join("+");
      papeis.add(dois);
      // nunca os dois falando, nunca os dois escutando
      expect(dois).not.toBe("falando+falando");
      expect(dois).not.toBe("escutando+escutando");
      // um balão por vez
      expect(!!c.a.fala && !!c.b.fala).toBe(false);
    }
    expect(papeis.has("escutando+falando")).toBe(true);
  });

  it("os papéis se alternam entre abertura e resposta", () => {
    const m = comFalha();
    ate(m, () => m.conversas[0]?.fase === "falando");
    const c = m.conversas[0];
    const vistos = new Set<string>();
    for (let i = 0; i < 30 * 60; i++) {
      m.atualizar(1 / 30, false);
      if (c.fase !== "falando") break;
      vistos.add(`${c.a.papel}/${c.b.papel}`);
    }
    expect(vistos.has("falando/escutando")).toBe(true);
    expect(vistos.has("escutando/falando")).toBe(true);
  });

  it("há despedida entre a última fala e a saída", () => {
    const m = comFalha();
    ate(m, () => m.conversas[0]?.fase === "falando");
    const c = m.conversas[0];
    let viuDespedida = false;
    let andouAntesDaDespedida = false;
    for (let i = 0; i < 30 * 60; i++) {
      m.atualizar(1 / 30, false);
      if (!m.conversas.includes(c)) break;
      if (c.fase === "despedida") {
        viuDespedida = true;
        expect(c.a.papel).toBe("despedindo");
        expect(c.b.papel).toBe("despedindo");
        expect(c.a.fala).toBeUndefined();
        if (c.a.fase === "voltando" || c.b.fase === "voltando") andouAntesDaDespedida = true;
      }
    }
    expect(viuDespedida).toBe(true);
    expect(andouAntesDaDespedida).toBe(false);
  });

  it("ao voltar para o posto o papel é limpo", () => {
    const m = comFalha();
    ate(m, () => m.conversas.length > 0);
    ate(m, () => m.conversas.length === 0, 300);
    ate(m, () => m.porId.get("rh")!.fase === "mesa", 300);
    expect(m.porId.get("rh")!.papel).toBeUndefined();
    expect(m.porId.get("automacoes")!.papel).toBeUndefined();
  });

  it("o refresh não apaga o papel de quem está conversando", () => {
    const m = comFalha();
    ate(m, () => m.conversas[0]?.fase === "falando");
    const c = m.conversas[0];
    const antes = { a: c.a.papel, b: c.b.papel, x: c.a.x, y: c.a.y };
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA + 60_000);
    expect(c.a.papel).toBe(antes.a);
    expect(c.b.papel).toBe(antes.b);
    expect(c.a.x).toBe(antes.x);
    expect(c.a.y).toBe(antes.y);
    expect(m.conversas).toContain(c);
  });

  it("quem conversa lado a lado olha um para o outro", () => {
    const m = comFalha();
    expect(ate(m, () => m.conversas[0]?.fase === "encarando")).toBe(true);
    const c = m.conversas[0];
    if (Math.abs(c.a.x - c.b.x) > Math.abs(c.a.y - c.b.y)) {
      expect(c.a.direcao).toBe(c.a.x < c.b.x ? "direita" : "esquerda");
      expect(c.b.direcao).toBe(c.b.x < c.a.x ? "direita" : "esquerda");
    }
  });
});

describe("varredura: todo par que os dados produzem", () => {
  const sisSeed = SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo }));
  const baseSeed = Object.fromEntries(sisSeed.map((s) => [s.id, saudavel]));
  const dSeed: DadosEscritorio = {
    fonte: "hub", geradoEm: null, sistemas: sisSeed, conectores: [],
    integracoes: INTEGRACOES_SEED, saude: baseSeed,
  };
  const andarSeed = montarAndar(dSeed.sistemas, dSeed.conectores);

  it("nenhum par chega a menos de dois tiles um do outro, em nenhum instante", () => {
    const problemas: string[] = [];
    for (const alvo of sisSeed) {
      const m = criarMotor(andarSeed, dSeed, AGORA);
      m.atualizarDados({ ...dSeed, saude: { ...baseSeed, [alvo.id]: emFalha } }, AGORA);
      let minD = Infinity;
      let par = "";
      for (let i = 0; i < 30 * 400; i++) {
        m.atualizar(1 / 30, false);
        const c = m.conversas[0];
        if (!c) continue;
        par = `${c.a.id}→${c.b.id}`;
        minD = Math.min(minD, Math.hypot(c.a.x - c.b.x, c.a.y - c.b.y));
      }
      if (par && minD < 2 * TILE) problemas.push(`${par}: ${Math.round(minD)}px`);
    }
    expect(problemas).toEqual([]);
  });

  it("todo encontro acontece lado a lado, com os dois se olhando", () => {
    const problemas: string[] = [];
    for (const alvo of sisSeed) {
      const m = criarMotor(andarSeed, dSeed, AGORA);
      m.atualizarDados({ ...dSeed, saude: { ...baseSeed, [alvo.id]: emFalha } }, AGORA);
      for (let i = 0; i < 30 * 400; i++) {
        m.atualizar(1 / 30, false);
        const c = m.conversas[0];
        if (c?.fase !== "encarando") continue;
        const olhando = c.a.direcao !== "frente" && c.b.direcao !== "frente" && c.a.direcao !== c.b.direcao;
        if (!olhando) problemas.push(`${c.a.id}→${c.b.id}: ${c.a.direcao}/${c.b.direcao}`);
        break;
      }
    }
    expect(problemas).toEqual([]);
  });
});

/* -------------------------- 2B: validação final da coreografia --- */

describe("evento real vence conversa ambiental", () => {
  it("com incidente pendente, nenhuma conversa ambiental começa", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);

    let primeira: { temEvento: boolean } | null = null;
    const ambientaisComPendencia: string[] = [];
    const vistas = new Set<object>();

    // roda muito além do piso ambiental (180 s) para dar chance real de errar
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      for (const c of m.conversas) {
        if (vistas.has(c)) continue;
        vistas.add(c);
        if (!primeira) primeira = { temEvento: !!c.evento };
        if (!c.evento && m.pendentes().length > 0) {
          ambientaisComPendencia.push(`${c.a.id}→${c.b.id}`);
        }
      }
    }

    expect(primeira, "nenhuma conversa aconteceu").not.toBeNull();
    expect(primeira!.temEvento, "a primeira conversa foi ambiental").toBe(true);
    expect(ambientaisComPendencia).toEqual([]);
  });

  it("sem nada pendente, a ambiental volta a ser possível", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.atualizarDados(dadosEco, AGORA); // retrato igual: nenhum evento
    expect(m.pendentes()).toEqual([]);
    let ambiental = false;
    for (let i = 0; i < 30 * 900; i++) {
      m.atualizar(1 / 30, false);
      if (m.conversas.some((c) => !c.evento)) ambiental = true;
    }
    expect(ambiental).toBe(true);
  });
});

/**
 * FIXTURE DE TESTE — dois pares independentes.
 *
 * Existe só para provar que duas conversas coexistem sem se misturar. Não é
 * importada por nada da aplicação: os eventos de produção continuam saindo do
 * diff do retorno do HUB.
 */
describe("duas conversas ao mesmo tempo (fixture de teste)", () => {
  const quatro = [
    { id: "t-um", nome: "Sistema Um", grupo: "Pessoas" },
    { id: "t-dois", nome: "Sistema Dois", grupo: "Comercial" },
    { id: "t-tres", nome: "Sistema Três", grupo: "Financeiro" },
    { id: "t-quatro", nome: "Sistema Quatro", grupo: "Obra" },
  ];
  const saudeOk = Object.fromEntries(quatro.map((s) => [s.id, saudavel]));
  const dadosQuatro: DadosEscritorio = {
    fonte: "hub",
    geradoEm: null,
    sistemas: quatro,
    conectores: [],
    // dois pares SEM aresta cruzada: cada evento só tem um destino possível
    integracoes: [
      { origem: "t-um", destino: "t-dois", label: "par a" },
      { origem: "t-tres", destino: "t-quatro", label: "par b" },
    ],
    saude: saudeOk,
  };
  const andarQuatro = montarAndar(dadosQuatro.sistemas, dadosQuatro.conectores);

  const dois = () => {
    const m = criarMotor(andarQuatro, dadosQuatro, AGORA);
    m.atualizarDados(
      { ...dadosQuatro, saude: { ...saudeOk, "t-um": emFalha, "t-tres": emFalha } },
      AGORA,
    );
    return m;
  };

  it("os dois pares conversam ao mesmo tempo, cada um com o seu interlocutor", () => {
    const m = dois();
    let chegouADois = false;
    const pares = new Set<string>();
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      if (m.conversas.length === 2) chegouADois = true;
      for (const c of m.conversas) pares.add(`${c.a.id}→${c.b.id}`);
    }
    expect(chegouADois, "nunca houve duas conversas ao mesmo tempo").toBe(true);
    expect([...pares].sort()).toEqual(["t-tres→t-quatro", "t-um→t-dois"]);
  });

  it("nunca passa de duas conversas nem de seis em circulação", () => {
    const m = dois();
    let picoConversas = 0;
    let picoCirculando = 0;
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      picoConversas = Math.max(picoConversas, m.conversas.length);
      picoCirculando = Math.max(picoCirculando, m.viagensAtivas());
    }
    expect(picoConversas).toBeLessThanOrEqual(2);
    expect(picoCirculando).toBeLessThanOrEqual(6);
  });

  it("ninguém troca de par nem invade o par vizinho", () => {
    const m = dois();
    const parceiro = new Map<string, string>();
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      for (const c of m.conversas) {
        for (const [x, y] of [[c.a, c.b], [c.b, c.a]] as const) {
          const anterior = parceiro.get(x.id);
          if (anterior && anterior !== y.id) {
            throw new Error(`${x.id} trocou de interlocutor: ${anterior} → ${y.id}`);
          }
          parceiro.set(x.id, y.id);
        }
      }
    }
    expect(parceiro.get("t-um")).toBe("t-dois");
    expect(parceiro.get("t-tres")).toBe("t-quatro");
  });

  it("nenhum personagem chega perto demais de qualquer outro que esteja fora da mesa", () => {
    const m = dois();
    let pior = Infinity;
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      const fora = m.personagens.filter((p) => p.fase !== "mesa" && p.fase !== "oculto");
      for (let a = 0; a < fora.length; a++) {
        for (let b = a + 1; b < fora.length; b++) {
          pior = Math.min(pior, Math.hypot(fora[a].x - fora[b].x, fora[a].y - fora[b].y));
        }
      }
    }
    expect(pior).toBeGreaterThanOrEqual(2 * TILE);
  });

  it("o balão de um par nunca aparece no outro", () => {
    const m = dois();
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      for (const c of m.conversas) {
        const textos = c.linhas.map((l) => l.texto);
        for (const p of [c.a, c.b]) {
          if (p.fala) expect(textos, `${p.id} falou fora do roteiro`).toContain(p.fala);
        }
      }
      // no máximo um balão por conversa
      for (const c of m.conversas) expect(!!c.a.fala && !!c.b.fala).toBe(false);
    }
  });

  it("os quatro voltam para os próprios postos", () => {
    const m = dois();
    for (let i = 0; i < 30 * 600; i++) m.atualizar(1 / 30, false);
    for (const s of quatro) {
      const p = m.porId.get(s.id)!;
      expect(p.fase, s.id).toBe("mesa");
      expect(Math.round(p.x), s.id).toBe(p.mesa!.pessoaX);
      expect(Math.round(p.y), s.id).toBe(p.mesa!.pessoaY);
      expect(p.papel, s.id).toBeUndefined();
    }
  });
});

/**
 * CICLO COMPLETO COM OS DADOS REAIS DO ESCRITÓRIO.
 *
 * Sem fixture inventada: sistemas, grupos e integrações saem do seed, que é
 * a mesma forma que o HUB entrega. O objetivo é provar que a coreografia não
 * depende da fixture de demonstração.
 */
describe("ciclo completo sobre o ecossistema real", () => {
  const sisReal = SISTEMAS_SEED.map((s) => ({ id: s.id, nome: s.nome, grupo: s.grupo }));
  const saudeReal = Object.fromEntries(sisReal.map((s) => [s.id, saudavel]));
  const dadosReal: DadosEscritorio = {
    fonte: "hub",
    geradoEm: null,
    sistemas: sisReal,
    conectores: [],
    integracoes: INTEGRACOES_SEED,
    saude: saudeReal,
  };
  const andarReal = montarAndar(dadosReal.sistemas, dadosReal.conectores);
  const comRetrato = (saude: DadosEscritorio["saude"]) => ({ ...dadosReal, saude });

  it("o Gestor de Automações recebe o aviso quando é vizinho real do afetado", () => {
    // no grafo do seed, `hub-bloco-id` troca dados com `automacoes`
    const m = criarMotor(andarReal, dadosReal, AGORA);
    m.atualizarDados(comRetrato({ ...saudeReal, "hub-bloco-id": emFalha }), AGORA);
    for (let i = 0; i < 30 * 400 && m.conversas.length === 0; i++) m.atualizar(1 / 30, false);
    expect(m.conversas).toHaveLength(1);
    expect(m.conversas[0].a.id).toBe("hub-bloco-id");
    expect(m.conversas[0].b.id).toBe("automacoes");
  });

  it("problema → conversa → pendente → recuperação → conversa → postos", () => {
    const m = criarMotor(andarReal, dadosReal, AGORA);
    const rodar = (seg: number) => {
      for (let i = 0; i < seg * 30; i++) m.atualizar(1 / 30, false);
    };
    const iniciadas = () => m.registros.filter((r) => r.resultado === "iniciada").length;

    // 1. o retrato acusa a queda
    const eventos = m.atualizarDados(comRetrato({ ...saudeReal, "hub-bloco-id": emFalha }), AGORA);
    expect(eventos.map((e) => e.tipo)).toContain("entrou_em_falha");
    expect(m.pendentes()).toContain("hub-bloco-id");

    // 2. a conversa nasce do evento, não de sorteio
    for (let i = 0; i < 30 * 400 && m.conversas.length === 0; i++) m.atualizar(1 / 30, false);
    expect(m.conversas[0].evento?.tipo).toBe("entrou_em_falha");
    const apos1 = iniciadas();

    // 3. a conversa termina e os dois voltam
    rodar(400);
    expect(m.conversas).toHaveLength(0);
    for (const id of ["hub-bloco-id", "automacoes"]) {
      const p = m.porId.get(id)!;
      expect(p.fase, id).toBe("mesa");
      expect(Math.round(p.x), id).toBe(p.mesa!.pessoaX);
      expect(p.papel, id).toBeUndefined();
    }

    // 4. conversar NÃO resolve: o incidente segue pendente e não se repete
    for (let ciclo = 1; ciclo <= 4; ciclo++) {
      m.atualizarDados(
        comRetrato({ ...saudeReal, "hub-bloco-id": { ...emFalha, falhas: 300 + ciclo * 40 } }),
        AGORA + ciclo * 60_000,
      );
      rodar(120);
      expect(m.pendentes(), `ciclo ${ciclo}`).toContain("hub-bloco-id");
    }
    expect(iniciadas(), "o mesmo problema virou conversa de novo").toBe(apos1);
    // o estado real do sistema não foi mexido pela conversa
    expect(m.porId.get("hub-bloco-id")!.estado).toBe("falha");

    // 5. só a recuperação REAL encerra o incidente
    const recup = m.atualizarDados(comRetrato(saudeReal), AGORA + 600_000);
    expect(recup.map((e) => e.tipo)).toContain("recuperado");
    expect(m.pendentes()).not.toContain("hub-bloco-id");

    // 6. e ela gera a conversa de encerramento
    for (let i = 0; i < 30 * 400 && !m.conversas.some((c) => c.evento?.tipo === "recuperado"); i++) {
      m.atualizar(1 / 30, false);
    }
    expect(m.conversas.some((c) => c.evento?.tipo === "recuperado")).toBe(true);

    /*
     * 7. os dois voltam ao posto.
     *
     * A janela é curta de propósito: sem pendência a conversa ambiental volta
     * a ser permitida, e depois do piso de 180 s alguém pode legitimamente
     * levantar de novo. Sessenta segundos dão tempo de caminhar de volta sem
     * confundir vida normal com falha de retorno.
     */
    for (let i = 0; i < 30 * 400 && m.conversas.length > 0; i++) m.atualizar(1 / 30, false);
    rodar(60);
    for (const id of ["hub-bloco-id", "automacoes"]) {
      const p = m.porId.get(id)!;
      expect(p.fase, id).toBe("mesa");
      expect(Math.round(p.x), id).toBe(p.mesa!.pessoaX);
      expect(p.papel, id).toBeUndefined();
    }
  });

  it("a coreografia inteira acontece com dados reais, na ordem certa", () => {
    const m = criarMotor(andarReal, dadosReal, AGORA);
    m.atualizarDados(comRetrato({ ...saudeReal, "hub-bloco-id": emFalha }), AGORA);
    const etapas: string[] = [];
    for (let i = 0; i < 30 * 400; i++) {
      m.atualizar(1 / 30, false);
      const c = m.conversas[0];
      if (!c) {
        if (etapas.length) break;
        continue;
      }
      const marca = `${c.fase}:${c.a.papel ?? "-"}/${c.b.papel ?? "-"}`;
      if (etapas[etapas.length - 1] !== marca) etapas.push(marca);
    }
    const texto = etapas.join(" | ");
    expect(texto).toContain("indo:-/-");
    expect(texto).toContain("aguardando");
    expect(texto).toContain("falando:falando/escutando");
    expect(texto).toContain("falando:escutando/falando");
    expect(texto).toContain("despedida:despedindo/despedindo");
    // ordem: encarar antes de falar, despedir depois de falar
    const iEncarar = etapas.findIndex((e) => e.startsWith("encarando"));
    const iFalar = etapas.findIndex((e) => e.startsWith("falando"));
    const iDespedir = etapas.findIndex((e) => e.startsWith("despedida"));
    expect(iEncarar).toBeGreaterThan(-1);
    expect(iEncarar).toBeLessThan(iFalar);
    expect(iFalar).toBeLessThan(iDespedir);
  });
});

/**
 * MODO DEMONSTRAÇÃO — camada visual, nunca simulação de dado.
 *
 * O seed é a pior situação possível: `saude` é `{}`, então todo mundo é
 * `sem-dados` e nenhum par seria elegível. É exatamente por isso que ele
 * serve de fixture aqui.
 */
describe("modo demonstração", () => {
  const andarSemente = montarAndar(DADOS_SEMENTE.sistemas, DADOS_SEMENTE.conectores);
  const rodar = (demo: boolean, seg = 300) => {
    const m = criarMotor(andarSemente, DADOS_SEMENTE, AGORA);
    const visto = {
      andou: false,
      picoConversas: 0,
      picoCirculando: 0,
      papeis: new Set<string>(),
      fases: new Set<string>(),
      falou: false,
      distMin: Infinity,
    };
    for (let i = 0; i < seg * 30; i++) {
      m.atualizar(1 / 30, demo);
      if (m.personagens.some((p) => p.fase === "indo")) visto.andou = true;
      if (m.personagens.some((p) => p.fala)) visto.falou = true;
      visto.picoConversas = Math.max(visto.picoConversas, m.conversas.length);
      visto.picoCirculando = Math.max(visto.picoCirculando, m.viagensAtivas());
      for (const c of m.conversas) {
        visto.fases.add(c.fase);
        visto.papeis.add(`${c.a.papel}/${c.b.papel}`);
        visto.distMin = Math.min(visto.distMin, Math.hypot(c.a.x - c.b.x, c.a.y - c.b.y));
      }
    }
    return { m, visto };
  };

  it("sem demonstração, o seed vazio continua parado: sem dado ninguém conversa", () => {
    const { visto } = rodar(false);
    expect(visto.andou).toBe(false);
    expect(visto.picoConversas).toBe(0);
    expect(visto.falou).toBe(false);
  });

  it("um sistema ocioso continua impedido de conversar fora da demonstração", () => {
    // "parado" é ocioso no fixture principal e tem integração de saída
    const m = criarMotor(andar, dados, AGORA);
    for (let i = 0; i < 30 * 600; i++) m.atualizar(1 / 30, false);
    for (const c of m.conversas) {
      expect(c.a.estado).not.toBe("ocioso");
      expect(c.b.estado).not.toBe("ocioso");
    }
    expect(m.porId.get("parado")!.fase).toBe("mesa");
  });

  it("na demonstração o escritório ganha vida mesmo com o retrato vazio", () => {
    const { visto } = rodar(true);
    expect(visto.andou).toBe(true);
    expect(visto.picoConversas).toBeGreaterThan(0);
    expect(visto.falou).toBe(true);
  });

  it("a coreografia completa acontece na demonstração", () => {
    const { visto } = rodar(true);
    expect(visto.fases.has("encarando")).toBe(true);
    expect(visto.fases.has("falando")).toBe(true);
    expect(visto.fases.has("despedida")).toBe(true);
    expect(visto.papeis.has("falando/escutando")).toBe(true);
    expect(visto.papeis.has("escutando/falando")).toBe(true);
    expect(visto.papeis.has("despedindo/despedindo")).toBe(true);
  });

  it("na demonstração eles também param a dois tiles, sem se atravessar", () => {
    const { visto } = rodar(true);
    expect(visto.distMin).toBeGreaterThanOrEqual(2 * TILE);
  });

  it("os limites de circulação valem igual na demonstração", () => {
    const { visto } = rodar(true);
    expect(visto.picoConversas).toBeLessThanOrEqual(2);
    expect(visto.picoCirculando).toBeLessThanOrEqual(6);
  });

  it("todos voltam aos postos na demonstração", () => {
    const m = criarMotor(andarSemente, DADOS_SEMENTE, AGORA);
    for (let i = 0; i < 30 * 200; i++) m.atualizar(1 / 30, true);
    // deixa terminar o que estiver em curso
    for (let i = 0; i < 30 * 400 && m.conversas.length > 0; i++) m.atualizar(1 / 30, false);
    for (let i = 0; i < 30 * 60; i++) m.atualizar(1 / 30, false);
    for (const p of m.personagens) {
      if (p.tipo !== "sistema") continue;
      expect(p.fase, p.id).toBe("mesa");
      expect(p.papel, p.id).toBeUndefined();
      expect(Math.round(p.x), p.id).toBe(p.mesa!.pessoaX);
    }
  });

  it("a demonstração NÃO mexe na saúde: quem está sem dado continua sem dado", () => {
    const { m } = rodar(true);
    for (const p of m.personagens) expect(p.estado, p.id).toBe("sem-dados");
    // e o retrato em si não foi tocado
    expect(DADOS_SEMENTE.saude).toEqual({});
  });

  it("a demonstração não inventa evento nem pendência", () => {
    const { m } = rodar(true);
    expect(m.pendentes()).toEqual([]);
    expect(m.fila.tamanho()).toBe(0);
    expect(m.registros.filter((r) => r.resultado === "iniciada")).toEqual([]);
    for (const c of m.conversas) expect(c.evento).toBeUndefined();
  });
});

describe("trabalho de demanda aparece sem falsificar saúde", () => {
  const semAtividade = { execs: 1000, ok: 1000, falhas: 0, ultima: antigo };
  const dadosParados: DadosEscritorio = {
    ...dadosEco,
    saude: Object.fromEntries(dadosEco.sistemas.map((s) => [s.id, semAtividade])),
  };

  it("demanda em trabalho põe o BLINK a digitar, sem mexer no estado", () => {
    const m = criarMotor(andarEco, dadosParados, AGORA);
    const p = m.porId.get("automacoes")!;
    expect(p.estado).toBe("ocioso");
    expect(digitando(p)).toBe(false);

    m.definirTrabalhoDeDemanda("automacoes", 2);
    m.atualizar(1 / 30, false);
    let digitou = false;
    for (let i = 0; i < 60; i++) {
      m.atualizar(1 / 30, false);
      if (digitando(p)) digitou = true;
    }
    expect(digitou, "não apareceu trabalho").toBe(true);
    // a saúde continua sendo o que o retrato diz
    expect(p.estado).toBe("ocioso");
  });

  it("demanda concluída encerra o trabalho visual", () => {
    const m = criarMotor(andarEco, dadosParados, AGORA);
    const p = m.porId.get("automacoes")!;
    m.definirTrabalhoDeDemanda("automacoes", 1);
    m.atualizar(1 / 30, false);
    m.definirTrabalhoDeDemanda("automacoes", 0);
    for (let i = 0; i < 120; i++) {
      m.atualizar(1 / 30, false);
      expect(digitando(p)).toBe(false);
    }
  });

  it("demanda parada no backlog não faz ninguém fingir execução", () => {
    const m = criarMotor(andarEco, dadosParados, AGORA);
    // backlog e a_fazer não entram na contagem de trabalho
    m.definirTrabalhoDeDemanda("automacoes", 0);
    const p = m.porId.get("automacoes")!;
    for (let i = 0; i < 120; i++) {
      m.atualizar(1 / 30, false);
      expect(digitando(p)).toBe(false);
    }
  });

  it("evento de demanda entra pela mesma fila dos eventos do HUB", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    expect(m.fila.tamanho()).toBe(0);
    m.registrarEventos([
      { id: "d1", tipo: "demanda_avancou", sistema: "automacoes", timestamp: AGORA, prioridade: 4 },
    ]);
    expect(m.fila.tamanho()).toBe(1);
  });

  it("evento de falha continua passando na frente de evento de demanda", () => {
    const m = criarMotor(andarEco, dadosEco, AGORA);
    m.registrarEventos([
      { id: "d1", tipo: "demanda_nova", sistema: "automacoes", timestamp: AGORA, prioridade: 5 },
    ]);
    m.atualizarDados({ ...dadosEco, saude: { ...dadosEco.saude, rh: emFalha } }, AGORA);
    for (let i = 0; i < 30 * 400 && m.conversas.length === 0; i++) m.atualizar(1 / 30, false);
    expect(m.conversas[0].evento?.tipo).toBe("entrou_em_falha");
  });
});

describe("serviço só entrega quando executou de verdade", () => {
  const conectores = [{ id: "n8n", nome: "n8n" }];
  const base = {
    ...dadosEco,
    conectores,
    integracoes: [...dadosEco.integracoes, { origem: "n8n", destino: "automacoes", label: "execuções" }],
  };
  const andarServ = montarAndar(base.sistemas, conectores);
  const rodar = (ultima: string | null) => {
    const saude = { ...dadosEco.saude, n8n: { execs: 900, ok: 900, falhas: 0, ultima } };
    const m = criarMotor(andarServ, { ...base, saude }, AGORA);
    const p = m.porId.get("n8n")!;
    let saiu = false;
    for (let i = 0; i < 30 * 600; i++) {
      m.atualizar(1 / 30, false);
      if (p.fase === "indo") saiu = true;
    }
    return { p, saiu };
  };

  it("saúde de 24 h NÃO basta para o serviço sair pela porta", () => {
    const { p, saiu } = rodar(new Date(AGORA - 20 * 3_600_000).toISOString());
    expect(p.estado, "a saúde continua trabalhando").toBe("trabalhando");
    expect(p.executando, "mas não executou agora").toBe(false);
    expect(saiu).toBe(false);
  });

  it("execução dentro da janela faz o serviço entregar", () => {
    const { p, saiu } = rodar(new Date(AGORA - 30_000).toISOString());
    expect(p.executando).toBe(true);
    expect(saiu).toBe(true);
  });

  it("sem carimbo de execução, nem estado nem saída", () => {
    const { p, saiu } = rodar(null);
    expect(p.executando).toBe(false);
    expect(saiu).toBe(false);
  });
});
