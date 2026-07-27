import { describe, it, expect } from "vitest";
import type { Demanda, Evento } from "@/domain/demand";
import { detectarRepeticoes, fraseDaRepeticao, rascunhoDeDemanda } from "@/domain/knowledge";

/**
 * O que estes testes protegem
 *
 * O rascunho vira artigo publicado. Um artigo publicado tem autoridade: a
 * próxima pessoa lê e age. Por isso o erro mais caro aqui não é um rascunho
 * incompleto — é um rascunho **confiante e errado**, que documenta como
 * solução uma hipótese que foi descartada e manda a próxima pessoa pelo
 * caminho errado com a autoridade de um artigo.
 */

function fala(id: string, em: string, autorId: string, texto: string, interna = false): Evento {
  return {
    id, tipo: "fala",
    autor: { id: autorId, nome: autorId, avatarUrl: null, ia: false },
    em, texto, interna,
  };
}

function demanda(patch: Partial<Demanda> = {}): Demanda {
  return {
    id: "d1", referencia: "#1",
    titulo: "Exportação de relatório falha em volumes grandes",
    descricao: "Ao exportar o relatório do financeiro com muitas linhas, a tela recarrega e nada baixa.",
    status: { id: "c", rotulo: "Concluído", categoria: "concluida", ordem: 9 },
    prioridade: "alta", tipo: "bug", complexidade: "media",
    sistema: { id: "financeiro", nome: "Financeiro" },
    responsaveis: [], autor: { id: "ana", nome: "Ana", avatarUrl: null },
    criadaEm: "2026-03-01", atualizadaEm: "2026-03-10", diasParada: 0,
    prazo: null, sla: null, ia: null, progresso: null, comentarios: null,
    anexos: null, etiquetas: [], concluida: true, risco: null, fonte: "demands",
    ...patch,
  } as Demanda;
}

describe("rascunho a partir da demanda resolvida", () => {
  const eventos = [
    fala("1", "2026-03-01", "ana", "Toda vez que exporto acima de dez mil linhas a página recarrega sozinha."),
    fala("2", "2026-03-02", "dev", "Tentamos aumentar o timeout do servidor, não resolveu."),
    fala("3", "2026-03-05", "dev", "O problema era o limite de memória do worker de exportação."),
    fala("4", "2026-03-06", "dev", "Passamos a gerar o arquivo em lotes de mil linhas e subiu o limite para 64MB."),
  ];

  it("monta o rascunho sem nenhuma chamada de IA", () => {
    const r = rascunhoDeDemanda(demanda(), eventos, ["O relatório baixa com 50 mil linhas."], "ana");
    expect(r.problema).toContain("exportar o relatório");
    expect(r.solucao.length).toBeGreaterThan(0);
    expect(r.comoVerificar).toEqual(["O relatório baixa com 50 mil linhas."]);
  });

  it("sintomas vêm só de quem abriu, e só antes da primeira resposta", () => {
    // Depois da primeira resposta a conversa vira negociação ("consegue mandar
    // o print?") — e isso não descreve o problema para ninguém.
    const r = rascunhoDeDemanda(demanda(), eventos, [], "ana");
    expect(r.sintomas).toHaveLength(1);
    expect(r.sintomas[0]).toContain("dez mil linhas");
  });

  it("a solução são as últimas falas da equipe, não as primeiras", () => {
    // "Tentamos aumentar o timeout, não resolveu" é hipótese descartada.
    // Documentá-la como solução é o erro mais caro possível aqui.
    const r = rascunhoDeDemanda(demanda(), eventos, [], "ana");
    expect(r.solucao.join(" ")).toContain("lotes de mil linhas");
    expect(r.solucao.join(" ")).not.toContain("Tentamos aumentar o timeout");
  });

  it("nota interna não entra no artigo", () => {
    const comNota = [...eventos, fala("5", "2026-03-07", "dev", "Cliente é chato, cuidado ao responder.", true)];
    const r = rascunhoDeDemanda(demanda(), comNota, [], "ana");
    expect(r.solucao.join(" ")).not.toContain("chato");
  });

  it("completude denuncia rascunho vazio em vez de fingir que está pronto", () => {
    // Um artigo vazio ocupa a busca sem resolver — o pior estado de uma base.
    const semNada = rascunhoDeDemanda(demanda({ descricao: "" }), [], [], "ana");
    expect(semNada.completude).toBeLessThan(0.5);

    const completo = rascunhoDeDemanda(demanda(), eventos, ["O relatório baixa com 50 mil linhas."], "ana");
    expect(completo.completude).toBe(1);
  });

  it("extrai os termos pelos quais a próxima pessoa vai procurar", () => {
    const r = rascunhoDeDemanda(demanda(), eventos, [], "ana");
    expect(r.termos).toContain("relatorio");
    expect(r.termos.some((t) => t.startsWith("export"))).toBe(true);
    // Verbo de pedido não é assunto e não deve virar palavra-chave.
    expect(r.termos).not.toContain("preciso");
  });

  it("guarda a demanda de origem — vínculo é requisito, não enfeite", () => {
    const r = rascunhoDeDemanda(demanda(), eventos, [], "ana");
    expect(r.demandasDeOrigem).toEqual(["d1"]);
  });
});

describe("detecção de repetição", () => {
  const base = (id: string, titulo: string) =>
    demanda({ id, titulo, descricao: titulo, concluida: true });

  it("três ocorrências viram sugestão", () => {
    // Cinco seria seguro demais: na quinta vez a equipe já perdeu quatro
    // oportunidades de escrever.
    const rs = detectarRepeticoes([
      base("a", "Exportação de relatório trava no financeiro"),
      base("b", "Exportação de relatório lenta demais"),
      base("c", "Exportação de relatório com erro de memória"),
    ]);
    expect(rs).toHaveLength(1);
    expect(rs[0].vezes).toBe(3);
  });

  it("duas ocorrências ainda são coincidência", () => {
    const rs = detectarRepeticoes([
      base("a", "Exportação de relatório trava"),
      base("b", "Exportação de relatório lenta"),
    ]);
    expect(rs).toEqual([]);
  });

  it("demanda aberta não conta — só se aprende com o que terminou", () => {
    const rs = detectarRepeticoes([
      base("a", "Exportação de relatório trava"),
      base("b", "Exportação de relatório lenta"),
      demanda({ id: "c", titulo: "Exportação de relatório com erro", concluida: false }),
    ]);
    expect(rs).toEqual([]);
  });

  it("a sugestão é pergunta, não aviso", () => {
    // Aviso informa e devolve o problema. Pergunta oferece a ação no mesmo
    // lugar — a diferença entre um painel que se lê e um que se usa.
    const rs = detectarRepeticoes([
      base("a", "Exportação de relatório trava"),
      base("b", "Exportação de relatório lenta"),
      base("c", "Exportação de relatório falha"),
    ]);
    expect(fraseDaRepeticao(rs[0])).toMatch(/\?$/);
    expect(fraseDaRepeticao(rs[0])).toContain("3 demandas");
  });
});
