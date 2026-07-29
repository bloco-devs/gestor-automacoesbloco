import { describe, it, expect } from "vitest";
import {
  acoesSugeridas,
  montarBriefing,
  autorIa,
  deQuemEAVez,
  diasSemFala,
  frasePara,
  montarFio,
  participantes,
  type Evento,
} from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A tela da demanda é o ponto único de colaboração entre solicitante,
 * desenvolvedor, gestor e IA. Se o fio mentir sobre o que aconteceu — ordem
 * errada, nota interna vazando para quem abriu, IA contada como pessoa — o
 * dano não é visual: é de confiança entre pessoas que estão negociando
 * trabalho por ali.
 */

const rotulo = (v: string) => ({ a_fazer: "A Fazer", em_desenvolvimento: "Em Desenvolvimento", alta: "Alta" })[v] ?? v;

function fala(id: string, em: string, autorId: string | null = null, interna = false, ia = false): Evento {
  return {
    id,
    tipo: "fala",
    autor: ia ? autorIa() : autorId ? { id: autorId, nome: autorId, avatarUrl: null, ia: false } : null,
    em,
    texto: `texto ${id}`,
    interna,
  };
}

function mudanca(id: string, em: string, autorId: string): Evento {
  return {
    id,
    tipo: "mudanca",
    autor: { id: autorId, nome: autorId, avatarUrl: null, ia: false },
    em,
    texto: "moveu para A Fazer",
    interna: false,
  };
}

describe("fio da demanda", () => {
  it("ordena do mais antigo para o mais novo — conversa, não feed", () => {
    // Feed invertido obriga a rolar para cima para entender e para baixo para
    // agir. Quem lê um chamado quer a história na ordem em que aconteceu.
    const fio = montarFio([fala("c", "2026-03-03"), fala("a", "2026-03-01"), mudanca("b", "2026-03-02", "x")], true);
    expect(fio.map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("funde falas e mudanças num fio só", () => {
    const fio = montarFio([fala("a", "2026-03-01"), mudanca("b", "2026-03-02", "x")], true);
    expect(fio).toHaveLength(2);
    expect(fio.map((e) => e.tipo)).toEqual(["fala", "mudanca"]);
  });

  it("nota interna não aparece para quem não é da equipe", () => {
    const eventos = [fala("publica", "2026-03-01", "u1"), fala("privada", "2026-03-02", "u2", true)];
    expect(montarFio(eventos, false).map((e) => e.id)).toEqual(["publica"]);
    expect(montarFio(eventos, true).map((e) => e.id)).toEqual(["publica", "privada"]);
  });

  it("a IA não conta como participante — 'quem está envolvido' é sobre gente", () => {
    const eventos = [fala("a", "2026-03-01", "ana"), fala("b", "2026-03-02", null, false, true)];
    expect(participantes(eventos).map((p) => p.id)).toEqual(["ana"]);
  });

  it("não repete quem falou várias vezes", () => {
    const eventos = [fala("a", "2026-03-01", "ana"), fala("b", "2026-03-02", "ana"), fala("c", "2026-03-03", "bia")];
    expect(participantes(eventos).map((p) => p.id)).toEqual(["ana", "bia"]);
  });
});

describe("de quem é a vez", () => {
  // É a informação que mais evita demanda parada: parada quase sempre é os
  // dois lados achando que a vez é do outro.
  it("última fala do solicitante deixa a bola com a equipe", () => {
    const eventos = [fala("a", "2026-03-01", "dev"), fala("b", "2026-03-02", "quem-abriu")];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("equipe");
  });

  it("última fala da equipe deixa a bola com o solicitante", () => {
    const eventos = [fala("a", "2026-03-01", "quem-abriu"), fala("b", "2026-03-02", "dev")];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("solicitante");
  });

  it("resposta da IA conta como resposta da casa", () => {
    // Se a IA respondeu, a bola está com quem perguntou — senão a demanda
    // ficaria eternamente "aguardando a equipe" depois de já respondida.
    const eventos = [fala("a", "2026-03-01", "quem-abriu"), fala("b", "2026-03-02", null, false, true)];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("solicitante");
  });

  it("nota interna não move a vez — ela não foi vista por quem abriu", () => {
    const eventos = [fala("a", "2026-03-01", "quem-abriu"), fala("b", "2026-03-02", "dev", true)];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("equipe");
  });

  it("mudança de status não move a vez — mover não é responder", () => {
    const eventos = [fala("a", "2026-03-01", "quem-abriu"), mudanca("b", "2026-03-02", "dev")];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("equipe");
  });
});

describe("silêncio", () => {
  it("conta dias desde a última fala, ignorando mudanças de status", () => {
    // Uma demanda "em desenvolvimento" há três semanas sem uma única fala não
    // está em desenvolvimento. Movimento de coluna não é sinal de vida.
    const agora = new Date("2026-03-20").getTime();
    const eventos = [fala("a", "2026-03-10"), mudanca("b", "2026-03-19", "dev")];
    expect(diasSemFala(eventos, agora)).toBe(10);
  });

  it("sem falas devolve null — demanda nova não é demanda esquecida", () => {
    expect(diasSemFala([mudanca("b", "2026-03-19", "dev")])).toBeNull();
    expect(diasSemFala([])).toBeNull();
  });
});

describe("auditoria vira frase", () => {
  it("traduz o esquema do banco para português", () => {
    // Mostrar "status: a_fazer → em_desenvolvimento" é vazar o esquema para a
    // tela e obrigar o leitor a decodificar.
    expect(frasePara("update", "status", "backlog", "a_fazer", rotulo)).toBe("moveu para A Fazer");
    expect(frasePara("update", "priority", "baixa", "alta", rotulo)).toBe("mudou a prioridade para Alta");
  });

  it("distingue assumir de trocar de responsável", () => {
    expect(frasePara("update", "assigned_to", null, "u2", rotulo)).toBe("assumiu a demanda");
    expect(frasePara("update", "assigned_to", "u1", "u2", rotulo)).toBe("trocou o responsável");
    expect(frasePara("update", "assigned_to", "u1", null, rotulo)).toBe("removeu o responsável");
  });

  it("campo desconhecido não quebra a tela", () => {
    expect(frasePara("update", "algum_campo_novo", "a", "b", rotulo)).toBe("alterou algum campo novo");
  });
});

/**
 * O briefing e as ações.
 *
 * A métrica declarada é: o desenvolvedor entende tudo em menos de trinta
 * segundos. Numa demanda com quarenta mensagens isso só é possível se alguém
 * responder as quatro perguntas antes da leitura. Estes testes protegem a
 * ordem de precedência dessas respostas — porque "por onde começar" errado é
 * pior que "por onde começar" ausente: ele manda a pessoa para o lugar errado
 * com confiança.
 */
describe("briefing de 30 segundos", () => {
  const capacidades = {
    sla: true, ia: true, tipo: true, complexidade: true, auditoria: true,
    comentarios: true, progresso: true, etiquetas: true, prazo: true,
  };

  function demandaBase(patch: Record<string, unknown> = {}) {
    return {
      id: "d1", referencia: "#d1", titulo: "Exportação falha",
      descricao: "O relatório do financeiro não exporta em volumes grandes.",
      status: { id: "and", rotulo: "Em andamento", categoria: "andamento" as const, ordem: 1 },
      prioridade: "alta" as const, tipo: "bug" as const, complexidade: "media" as const,
      sistema: null, responsaveis: [{ id: "dev", nome: "Dev", avatarUrl: null }],
      autor: { id: "quem-abriu", nome: "Ana", avatarUrl: null },
      criadaEm: "2026-03-01", atualizadaEm: "2026-03-10", diasParada: 2,
      prazo: null, sla: null, ia: null, progresso: null, comentarios: null,
      anexos: null, etiquetas: [], concluida: false, risco: null, fonte: "demands" as const,
      ...patch,
    };
  }

  it("sem responsável, começar é assumir — antes de qualquer outra coisa", () => {
    const b = montarBriefing(
      demandaBase({ responsaveis: [] }) as never,
      [fala("a", "2026-03-02", "quem-abriu")],
      capacidades as never,
      "quem-abriu",
    );
    expect(b.porOndeComecar).toMatch(/assumir|atribuir/i);
    expect(b.travando).toContain("Ninguém assumiu.");
  });

  it("com a bola na equipe, começar é responder", () => {
    const b = montarBriefing(
      demandaBase() as never,
      [fala("a", "2026-03-02", "dev"), fala("b", "2026-03-05", "quem-abriu")],
      capacidades as never,
      "quem-abriu",
    );
    expect(b.porOndeComecar).toMatch(/responder/i);
  });

  it("'já foi dito' traz só falas da equipe — não repetir pergunta já feita", () => {
    const b = montarBriefing(
      demandaBase() as never,
      [fala("a", "2026-03-02", "quem-abriu"), fala("b", "2026-03-03", "dev")],
      capacidades as never,
      "quem-abriu",
    );
    expect(b.jaTentado).toHaveLength(1);
    expect(b.jaTentado[0]).toContain("texto b");
  });

  it("demanda concluída não tem nada travando nem por onde começar", () => {
    const b = montarBriefing(
      demandaBase({ concluida: true }) as never,
      [fala("a", "2026-03-02", "quem-abriu")],
      capacidades as never,
      "quem-abriu",
    );
    expect(b.travando).toEqual([]);
    expect(b.porOndeComecar).toMatch(/nada/i);
  });

  it("propõe cobrar só quando o silêncio é do lado de quem abriu", () => {
    const agora = "2026-03-20";
    const semResposta = [fala("a", "2026-03-01", "quem-abriu"), fala("b", "2026-03-02", "dev")];
    const acoes = acoesSugeridas(demandaBase({ atualizadaEm: agora }) as never, semResposta, "quem-abriu");
    expect(acoes.map((a) => a.tipo)).toContain("cobrar");

    const bolaNaEquipe = [fala("a", "2026-03-01", "dev"), fala("b", "2026-03-02", "quem-abriu")];
    const outras = acoesSugeridas(demandaBase() as never, bolaNaEquipe, "quem-abriu");
    expect(outras.map((a) => a.tipo)).not.toContain("cobrar");
  });

  it("demanda concluída não recebe sugestão de ação", () => {
    expect(acoesSugeridas(demandaBase({ concluida: true }) as never, [], "quem-abriu")).toEqual([]);
  });

  it("o rascunho de cobrança é uma mensagem curta, não um texto automático longo", () => {
    const acoes = acoesSugeridas(
      demandaBase() as never,
      [fala("a", "2026-03-01", "quem-abriu"), fala("b", "2026-03-02", "dev")],
      "quem-abriu",
    );
    const cobrar = acoes.find((a) => a.tipo === "cobrar");
    // Mensagem automática longa é percebida na primeira linha e ignorada.
    expect(cobrar && "rascunho" in cobrar && cobrar.rascunho.length).toBeLessThan(160);
  });
});

/**
 * Anexo no fio.
 *
 * A pergunta que isto responde é de ordem: o print veio antes ou depois da
 * pergunta? Numa aba separada de anexos, descobrir isso exige cruzar duas
 * cronologias de cabeça — e essa ordem quase sempre é a explicação.
 */
describe("anexos no fio", () => {
  function anexo(id: string, em: string, autorId: string, nome: string): Evento {
    return {
      id,
      tipo: "anexo",
      autor: { id: autorId, nome: autorId, avatarUrl: null, ia: false },
      em,
      texto: nome,
      anexoId: id,
      interna: false,
    };
  }

  it("entra na mesma cronologia das falas e das mudanças", () => {
    const fio = montarFio(
      [
        fala("pergunta", "2026-03-01", "dev"),
        anexo("print", "2026-03-02", "quem-abriu", "erro.png"),
        fala("resposta", "2026-03-03", "dev"),
      ],
      true,
    );
    expect(fio.map((e) => e.id)).toEqual(["pergunta", "print", "resposta"]);
  });

  it("anexo conta como sinal de vida — quem manda print está participando", () => {
    // Sem isto, uma demanda em que só se trocam evidências apareceria como
    // abandonada, e o copiloto sugeriria cobrar quem está colaborando.
    const agora = new Date("2026-03-10").getTime();
    expect(diasSemFala([anexo("a", "2026-03-08", "dev", "log.txt")], agora)).toBe(2);
  });

  it("anexo não move a vez — mandar arquivo não é responder", () => {
    const eventos = [fala("a", "2026-03-01", "quem-abriu"), anexo("b", "2026-03-02", "dev", "print.png")];
    expect(deQuemEAVez(eventos, "quem-abriu")).toBe("equipe");
  });


});