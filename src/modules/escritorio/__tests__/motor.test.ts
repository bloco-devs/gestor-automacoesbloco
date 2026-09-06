import { afterEach, describe, expect, it, vi } from "vitest";
import { montarAndar } from "../layout";
import { criarMotor } from "../motor";
import type { DadosEscritorio } from "../dados";
import { FECHOS, REGRAS, dialogoDoRotulo } from "../conversas";

const AGORA = Date.parse("2026-09-05T20:00:00Z");
const recente = new Date(AGORA - 3_600_000).toISOString();
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
