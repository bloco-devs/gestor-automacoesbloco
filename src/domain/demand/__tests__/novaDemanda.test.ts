import { describe, it, expect } from "vitest";
import {
  complexidadeDeEscala,
  criteriosMinimos,
  prioridadeDeScore,
  problemasDe,
  tipoDeClassificacao,
  type NovaDemanda,
} from "@/domain/demand";

/**
 * O que estes testes protegem
 *
 * A conversa passou a ser a entrada oficial do produto: o usuário descreve o
 * problema, a IA monta a demanda, ele confirma, e o desenvolvedor recebe
 * trabalho pronto. Não há mais triagem manual entre esses passos — o que
 * significa que **não há mais ninguém para consertar uma tradução errada**.
 *
 * Antes, um tipo mal classificado era corrigido por uma pessoa antes de virar
 * trabalho. Agora ele chega direto na fila. Estas regras são o que garante que
 * a demanda que chega lá é a demanda que a pessoa descreveu.
 */

function demanda(patch: Partial<NovaDemanda> = {}): NovaDemanda {
  return {
    titulo: "Relatório do financeiro não exporta",
    resumo: "Ao clicar em exportar, a tela recarrega e nada é baixado.",
    descricaoTecnica: "",
    tipo: "bug",
    complexidade: "media",
    prioridade: "media",
    sistemaId: null,
    criteriosDeAceite: ["O relatório baixa em PDF."],
    origemIa: true,
    confianca: 0.8,
    ...patch,
  };
}

describe("tradução da conversa para demanda técnica", () => {
  it("coisa quebrada é bug, mesmo quando a conversa classificou como ajuste", () => {
    // É o erro mais caro: bug tem SLA diferente de melhoria. Se a pessoa diz
    // que algo não funciona, a palavra dela vale mais que a classificação.
    expect(tipoDeClassificacao("ajuste_existente", "o relatório não funciona mais")).toBe("bug");
    expect(tipoDeClassificacao("novo_modulo", "deu erro ao salvar")).toBe("bug");
    expect(tipoDeClassificacao("ajuste_existente", "travou tudo hoje de manhã")).toBe("bug");
  });

  it("pedido sem sinal de falha vira melhoria ou funcionalidade", () => {
    expect(tipoDeClassificacao("ajuste_existente", "queria uma coluna a mais na tela")).toBe("melhoria");
    expect(tipoDeClassificacao("novo_sistema", "precisamos de um portal de fornecedores")).toBe(
      "nova_funcionalidade",
    );
    expect(tipoDeClassificacao(null, "seria bom ter um filtro por data")).toBe("melhoria");
  });

  it("a IA nunca escala sozinha para prioridade crítica", () => {
    // Urgência crítica depende de contexto que a IA não tem: quem está parado,
    // o que está em jogo hoje. Deixar a IA decidir isso enche a fila de
    // críticas e destrói o significado da palavra.
    const escalas = [0, 20, 44, 45, 74, 75, 99, 100];
    for (const s of escalas) {
      expect(prioridadeDeScore(s)).not.toBe("critica");
    }
    expect(prioridadeDeScore(80)).toBe("alta");
    expect(prioridadeDeScore(50)).toBe("media");
    expect(prioridadeDeScore(10)).toBe("baixa");
  });

  it("a escala de 1 a 10 vira as três faixas do trabalho", () => {
    expect(complexidadeDeEscala(1)).toBe("facil");
    expect(complexidadeDeEscala(3)).toBe("facil");
    expect(complexidadeDeEscala(4)).toBe("media");
    expect(complexidadeDeEscala(7)).toBe("media");
    expect(complexidadeDeEscala(8)).toBe("dificil");
    expect(complexidadeDeEscala(10)).toBe("dificil");
  });

  it("demanda sem critério de aceite nasce com um piso verificável", () => {
    // Demanda sem critério volta para o desenvolvedor como pergunta — e a
    // pergunta é justamente o que a conversa existia para evitar.
    const criterios = criteriosMinimos("Exportar relatório", []);
    expect(criterios.length).toBeGreaterThan(0);
    expect(criterios.join(" ")).toContain("Exportar relatório");
  });

  it("critérios vindos da conversa têm precedência sobre o piso", () => {
    const criterios = criteriosMinimos("Exportar relatório", ["  O PDF abre no Chrome.  ", "", "  "]);
    expect(criterios).toEqual(["O PDF abre no Chrome."]);
  });

  it("uma demanda bem formada não tem problemas a apontar", () => {
    expect(problemasDe(demanda())).toEqual([]);
  });

  it("problemas são descritos, não resumidos num booleano", () => {
    // A tela precisa dizer o que falta. "Inválido" não ajuda ninguém.
    const ruim = demanda({ titulo: "erro", resumo: "n sei", criteriosDeAceite: [] });
    const problemas = problemasDe(ruim);
    expect(problemas).toHaveLength(3);
    expect(problemas.every((p) => p.length > 20)).toBe(true);
  });
});
