import { describe, it, expect } from "vitest";
import { relacionar, resumirRelacionados, type Candidato, type Demanda } from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A meta é "o desenvolvedor deve ter a sensação de que alguém já pesquisou
 * antes dele". Uma lista de links produz o oposto: sensação de resultado de
 * busca, que é trabalho que ele ainda vai ter. O que separa as duas coisas é o
 * motivo — e um motivo errado é pior que nenhum, porque manda a pessoa ler um
 * artigo que não tem nada a ver e a faz ignorar o painel inteiro depois.
 */

function demanda(patch: Partial<Demanda> = {}): Demanda {
  return {
    id: "alvo", referencia: "#1",
    titulo: "Exportação de relatório falha em volumes grandes",
    descricao: "Ao exportar o relatório do financeiro com muitas linhas, a tela recarrega.",
    status: { id: "s", rotulo: "Aberta", categoria: "aberta", ordem: 0 },
    prioridade: "media", tipo: null, complexidade: null,
    sistema: { id: "financeiro", nome: "Financeiro" },
    responsaveis: [], autor: null, criadaEm: "", atualizadaEm: "", diasParada: 0,
    prazo: null, sla: null, ia: null, progresso: null, comentarios: null,
    anexos: null, etiquetas: [], concluida: false, risco: null, fonte: "demands",
    ...patch,
  } as Demanda;
}

const c = (p: Partial<Candidato> & { id: string; titulo: string }): Candidato => ({
  genero: "artigo",
  destino: `/x/${p.id}`,
  ...p,
} as Candidato);

describe("conhecimento relacionado", () => {
  it("todo item traz o motivo — sem motivo não entra", () => {
    const itens = relacionar(demanda(), [
      c({ id: "a1", titulo: "Como exportar relatórios grandes sem travar" }),
    ]);
    expect(itens).toHaveLength(1);
    expect(itens[0].porque).toMatch(/exporta|relat/i);
  });

  it("descarta o que não tem nada em comum", () => {
    // Um painel com item irrelevante faz a pessoa parar de olhar o painel.
    const itens = relacionar(demanda(), [
      c({ id: "a2", titulo: "Política de férias coletivas do RH" }),
    ]);
    expect(itens).toEqual([]);
  });

  it("mesmo sistema baixa o piso: uma palavra específica já basta", () => {
    const itens = relacionar(demanda(), [
      c({ id: "a3", titulo: "Exportação", sistemaId: "financeiro" }),
    ]);
    expect(itens).toHaveLength(1);
    expect(itens[0].porque).toMatch(/^Mesmo sistema/);
  });

  it("sistema diferente exige duas palavras — senão traria a base inteira", () => {
    const itens = relacionar(demanda(), [c({ id: "a4", titulo: "Exportação", sistemaId: "compras" })]);
    expect(itens).toEqual([]);
  });

  it("solução anterior vence artigo, que vence demanda parecida", () => {
    // Uma solução já foi aplicada e funcionou; um artigo foi escrito para ser
    // lido; uma demanda parecida pode estar aberta e sem resposta nenhuma.
    const iguais = { titulo: "Exportação de relatório falha em volumes grandes" };
    const itens = relacionar(demanda(), [
      c({ id: "d1", genero: "demanda", ...iguais }),
      c({ id: "s1", genero: "solucao", ...iguais }),
      c({ id: "k1", genero: "artigo", ...iguais }),
    ]);
    expect(itens.map((i) => i.genero)).toEqual(["solucao", "artigo", "demanda"]);
  });

  it("não relaciona a demanda com ela mesma", () => {
    const itens = relacionar(demanda(), [c({ id: "alvo", genero: "demanda", titulo: "Exportação de relatório falha" })]);
    expect(itens).toEqual([]);
  });

  it("palavras vazias não geram relação — 'para', 'com', 'que' não são assunto", () => {
    const itens = relacionar(
      demanda({ titulo: "Preciso que isso funcione para todos", descricao: "" }),
      [c({ id: "a5", titulo: "Preciso que aquilo funcione para alguns" })],
    );
    // "funcione" é comum, mas sozinha não passa do piso de duas palavras.
    expect(itens).toEqual([]);
  });

  it("no máximo cinco — quinze devolveria o trabalho de filtrar", () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      c({ id: `a${i}`, titulo: "Exportação de relatório em volumes grandes" }),
    );
    expect(relacionar(demanda(), muitos)).toHaveLength(5);
  });

  it("o resumo conta por gênero, com plural certo", () => {
    const itens = relacionar(demanda(), [
      c({ id: "k1", titulo: "Exportação de relatório grande" }),
      c({ id: "k2", titulo: "Exportação de relatório lenta" }),
      c({ id: "s1", genero: "solucao", titulo: "Exportação de relatório corrigida" }),
    ]);
    expect(resumirRelacionados(itens)).toMatch(/2 artigos/);
    expect(resumirRelacionados(itens)).toMatch(/1 solução anterior/);
  });

  it("sem relacionados devolve null — a linha some em vez de dizer 'nenhum'", () => {
    expect(resumirRelacionados([])).toBeNull();
  });
});
