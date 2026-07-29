import { describe, it, expect } from "vitest";
import { montarBriefing } from "../services/briefing";
import type { Evento } from "../services/fio";
import type { Capacidades, Demanda } from "../types";

const CAP: Capacidades = {
  sla: true, ia: true, tipo: true, complexidade: true, auditoria: true,
  comentarios: true, progresso: true, etiquetas: true, prazo: true,
};

function demanda(): Demanda {
  return {
    id: "d1", referencia: "#d1", titulo: "Pagamento não creditado",
    descricao: "O salário não caiu na conta.",
    status: { id: "and", rotulo: "Em andamento", categoria: "andamento", ordem: 1 },
    prioridade: "media", tipo: "melhoria", complexidade: "media",
    sistema: null, responsaveis: [{ id: "dev", nome: "Dev", avatarUrl: null }],
    autor: { id: "sol", nome: "Nielson Gomes", avatarUrl: null },
    criadaEm: "2026-07-28", atualizadaEm: "2026-07-29", diasParada: 1,
    prazo: null, sla: null, ia: null, progresso: null, comentarios: null,
    anexos: null, etiquetas: [], concluida: false, risco: null, fonte: "demands",
  } as Demanda;
}

function fala(id: string, autorId: string, nome: string, texto: string, ia = false): Evento {
  return {
    id, tipo: "fala",
    autor: { id: autorId, nome, avatarUrl: null, ia },
    em: `2026-07-28T1${id}:00:00Z`, texto, interna: false,
  } as Evento;
}

describe("briefing — último retorno da equipe", () => {
  it("traz UMA linha, não três, e com o primeiro nome de quem falou", () => {
    const b = montarBriefing(demanda(), [
      fala("0", "sol", "Nielson Gomes", "preciso disso"),
      fala("1", "dev", "André Laureano dos Santos Silva", "já estou resolvendo"),
      fala("2", "dev", "André Laureano dos Santos Silva", "ai você quer demais"),
    ], CAP, "sol");

    // Três falas copiadas no topo, com as MESMAS três visíveis no fio dois
    // centímetros abaixo, é duplicata — e ela cobra o espaço mais caro da tela.
    expect(b.jaTentado).toHaveLength(1);
    // Sem o nome, a citação lê-se como afirmação do sistema.
    expect(b.jaTentado[0]).toBe("André: ai você quer demais");
  });

  it("a IA se identifica como Blink", () => {
    const b = montarBriefing(demanda(), [
      fala("0", "sol", "Nielson", "oi"),
      fala("1", "ia", "Assistente", "encontrei dois artigos", true),
    ], CAP, "sol");
    expect(b.jaTentado[0]).toBe("✦ Blink: encontrei dois artigos");
  });

  it("fica vazio quando só quem abriu falou", () => {
    const b = montarBriefing(demanda(), [fala("0", "sol", "Nielson", "alguém aí?")], CAP, "sol");
    expect(b.jaTentado).toEqual([]);
  });

  it("não quebra quando o nome não veio", () => {
    const b = montarBriefing(demanda(), [
      fala("0", "sol", "Nielson", "oi"),
      fala("1", "dev", "—", "vou olhar"),
    ], CAP, "sol");
    expect(b.jaTentado[0]).toBe("vou olhar");
  });
});
