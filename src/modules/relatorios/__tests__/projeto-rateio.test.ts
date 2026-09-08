/**
 * Os testes do rateio de pontos de projeto.
 *
 * O QUE NÃO DÁ PARA TESTAR AQUI, E POR QUÊ
 *
 * As regras que vivem no banco: a permissão (`atividades_can_admin_board`), a
 * recusa de concluir sem responsável, a recusa de reabrir projeto já apurado,
 * a imutabilidade das tabelas, e o congelamento em `relatorio_fechar_ciclo`.
 * São RPCs e constraints em Postgres, e este projeto não tem banco local nem
 * contêiner. Cada uma está anotada abaixo com o nome exato da verificação que
 * a garante, para poder ser conferida no banco.
 *
 * O que dá para testar, e é o que mais importa: se a conta da tela é a MESMA
 * conta do banco. Se as duas divergirem, a tela promete um número e o
 * fechamento grava outro — e o do fechamento é o que vira dinheiro.
 */

import { describe, expect, it } from "vitest";
import {
  impedimentoParaClassificar,
  podeRatear,
  ratearPontos,
  resumoDaFila,
} from "../services/projeto-rateio";

/** A escala real, de `relatorio_classificacao_tipo`. Nunca inventada aqui. */
const FACIL = 50;
const MEDIO = 100;
const DIFICIL = 200;

// ===========================================================================
describe("o rateio divide igual e não perde ponto", () => {
  /*
   * O caso que originou tudo: "o projeto vai ser trabalhado por 2
   * desenvolvedores no caso do RPA, outros projetos pode ter so 1
   * desenvolvedor."
   */
  it("dois desenvolvedores dividem exato em qualquer classificação", () => {
    for (const pontos of [FACIL, MEDIO, DIFICIL]) {
      const r = ratearPontos(pontos, 2);
      expect(r.sobra, `${pontos} entre 2`).toBe(0);
      expect(r.porPessoa).toBe(pontos / 2);
      expect(r.primeiroRecebe).toBe(r.porPessoa);
    }
  });

  it("um desenvolvedor leva os pontos inteiros", () => {
    expect(ratearPontos(DIFICIL, 1)).toEqual({
      porPessoa: 200,
      sobra: 0,
      primeiroRecebe: 200,
      total: 200,
    });
  });

  /*
   * A INVARIANTE QUE DECIDE DINHEIRO.
   *
   * A soma das linhas congeladas tem de ser EXATAMENTE os pontos da entrega.
   * Se sobrar ponto no chão, o total da equipe fica menor que a soma das
   * entregas e o percentual contra a meta cai — mexendo na faixa de R$.
   */
  it("a soma das partes é sempre igual ao total, em toda combinação", () => {
    for (const pontos of [FACIL, MEDIO, DIFICIL]) {
      for (let n = 1; n <= 12; n++) {
        const r = ratearPontos(pontos, n);
        const soma = r.porPessoa * (n - 1) + r.primeiroRecebe;
        expect(soma, `${pontos} entre ${n}`).toBe(pontos);
        expect(r.total, `total de ${pontos} entre ${n}`).toBe(pontos);
      }
    }
  });

  it("três num Fácil: o resto vai para o primeiro, e ninguém fica com zero", () => {
    // 50 / 3 = 16,67. O SQL trunca para 16 e devolve 2 ao primeiro.
    const r = ratearPontos(FACIL, 3);
    expect(r.porPessoa).toBe(16);
    expect(r.sobra).toBe(2);
    expect(r.primeiroRecebe).toBe(18);
    expect(16 + 16 + 18).toBe(FACIL);
  });

  /*
   * Postgres trunca a divisão de inteiros; JavaScript não. Um `/` sem
   * `Math.floor` daria 16.666… na tela e 16 no banco.
   */
  it("a divisão trunca como a do Postgres, nunca arredonda para cima", () => {
    expect(ratearPontos(MEDIO, 3).porPessoa).toBe(33); // não 33,33 nem 34
    expect(ratearPontos(MEDIO, 7).porPessoa).toBe(14); // 14,28…
    expect(ratearPontos(DIFICIL, 3).porPessoa).toBe(66); // 66,66…
    expect(Number.isInteger(ratearPontos(MEDIO, 3).porPessoa)).toBe(true);
  });

  it("entrada sem sentido devolve zero em vez de NaN", () => {
    expect(ratearPontos(MEDIO, 0).total).toBe(0);
    expect(ratearPontos(MEDIO, -1).total).toBe(0);
    expect(ratearPontos(Number.NaN, 2).total).toBe(0);
  });
});

// ===========================================================================
describe("a guarda do rateio impossível", () => {
  /*
   * Espelha `IF v_pontos / v_n < 1` em `relatorio_classificar_projeto`, que
   * existe por causa de `rci_pontos_positivos CHECK (pontos > 0)`: sem a
   * guarda, o CHECK estouraria no fechamento do ciclo, longe da causa.
   */
  it("recusa quando alguém ficaria com zero", () => {
    expect(podeRatear(FACIL, 50)).toBe(true); // 1 ponto para cada
    expect(podeRatear(FACIL, 51)).toBe(false); // alguém ficaria com zero
    expect(podeRatear(DIFICIL, 200)).toBe(true);
    expect(podeRatear(DIFICIL, 201)).toBe(false);
  });

  it("sem responsável não há rateio possível", () => {
    expect(podeRatear(MEDIO, 0)).toBe(false);
  });

  it("nos casos reais — um ou dois desenvolvedores — sempre é possível", () => {
    for (const pontos of [FACIL, MEDIO, DIFICIL]) {
      expect(podeRatear(pontos, 1)).toBe(true);
      expect(podeRatear(pontos, 2)).toBe(true);
    }
  });
});

// ===========================================================================
describe("o botão não deixa enviar o que o banco vai recusar", () => {
  const aberto = { jaClassificado: false, responsaveis: 2, apuradoNoCiclo: null };
  const bom = {
    classificacao: "media",
    pontos: MEDIO,
    justificativa: "Integração nova com o ERP, com risco de dado duplicado.",
    motivo: "",
  };

  it("com tudo em ordem, não há impedimento", () => {
    expect(impedimentoParaClassificar(aberto, bom)).toBeNull();
  });

  it("projeto já apurado num ciclo está congelado", () => {
    // Espelha: nada na RPC deixa reescrever item congelado, e
    // `relatorio_reabrir_projeto` recusa reabrir projeto já apurado.
    expect(
      impedimentoParaClassificar({ ...aberto, apuradoNoCiclo: "2026-08" }, bom),
    ).toBe("congelado");
  });

  it("sem responsável, reclama disso — e não da justificativa", () => {
    // A ordem importa: mandar a pessoa escrever justificativa quando o
    // problema é a falta de responsável é mandar consertar o que não quebrou.
    expect(
      impedimentoParaClassificar({ ...aberto, responsaveis: 0 }, { ...bom, justificativa: "" }),
    ).toBe("sem-responsavel");
  });

  it("congelado ganha de qualquer outro problema", () => {
    expect(
      impedimentoParaClassificar(
        { jaClassificado: true, responsaveis: 0, apuradoNoCiclo: "2026-08" },
        { classificacao: null, pontos: null, justificativa: "", motivo: "" },
      ),
    ).toBe("congelado");
  });

  it("justificativa com menos de 15 caracteres é recusada", () => {
    // `rcpj_justificativa_substantiva CHECK (length(btrim(justificativa)) >= 15)`
    expect(impedimentoParaClassificar(aberto, { ...bom, justificativa: "curta" }))
      .toBe("justificativa-curta");
    // Espaço não conta: o banco usa btrim, e aqui é trim.
    expect(
      impedimentoParaClassificar(aberto, { ...bom, justificativa: "              " }),
    ).toBe("justificativa-curta");
    // Exatamente 15 passa, nos dois lados.
    expect(impedimentoParaClassificar(aberto, { ...bom, justificativa: "x".repeat(15) }))
      .toBeNull();
  });

  it("alterar classificação existente exige motivo de pelo menos 10", () => {
    const jaFeito = { ...aberto, jaClassificado: true };
    expect(impedimentoParaClassificar(jaFeito, bom)).toBe("motivo-obrigatorio");
    expect(impedimentoParaClassificar(jaFeito, { ...bom, motivo: "curto" }))
      .toBe("motivo-obrigatorio");
    expect(impedimentoParaClassificar(jaFeito, { ...bom, motivo: "x".repeat(10) }))
      .toBeNull();
  });

  it("na primeira classificação o motivo não é pedido", () => {
    expect(impedimentoParaClassificar(aberto, { ...bom, motivo: "" })).toBeNull();
  });

  it("sem escolher classificação não há o que enviar", () => {
    expect(
      impedimentoParaClassificar(aberto, { ...bom, classificacao: null, pontos: null }),
    ).toBe("sem-classificacao");
  });

  it("rateio impossível é recusado antes da justificativa", () => {
    expect(
      impedimentoParaClassificar(
        { ...aberto, responsaveis: 51 },
        { ...bom, classificacao: "facil", pontos: FACIL, justificativa: "" },
      ),
    ).toBe("rateio-impossivel");
  });
});

// ===========================================================================
describe("o resumo da fila junta demanda e projeto", () => {
  const demandas = [
    { ja_classificada: true, pontos: MEDIO },
    { ja_classificada: true, pontos: FACIL },
    { ja_classificada: false, pontos: null },
  ];
  const projetos = [
    { ja_classificado: true, pontos: DIFICIL },
    { ja_classificado: false, pontos: null },
    { ja_classificado: false, pontos: null },
  ];

  it("conta as duas coisas como entrega, porque é o que elas são", () => {
    const r = resumoDaFila(demandas, projetos);
    expect(r.aguardando).toBe(3); // 1 demanda + 2 projetos
    expect(r.classificadas).toBe(3); // 2 demandas + 1 projeto
    expect(r.projetosAguardando).toBe(2);
  });

  /*
   * Os pontos entram INTEGRAIS no resumo, não rateados. O rateio diz quem
   * recebe; o total da equipe é o valor da entrega, e é ele que a apuração
   * compara com a meta. Somar rateado daria o mesmo número por acaso quando a
   * divisão fecha, e um número menor quando não fecha.
   */
  it("os pontos somam integrais, não rateados", () => {
    expect(resumoDaFila(demandas, projetos).pontos).toBe(MEDIO + FACIL + DIFICIL);
  });

  it("fila vazia é zero, não NaN", () => {
    expect(resumoDaFila([], [])).toEqual({
      aguardando: 0,
      classificadas: 0,
      pontos: 0,
      projetosAguardando: 0,
    });
  });

  it("um projeto de dois desenvolvedores conta como UMA entrega", () => {
    // Ele gera duas linhas em `relatorio_ciclo_item`, uma por pessoa — mas
    // isso é congelamento. Na fila, e no total da equipe, é uma entrega só.
    const r = resumoDaFila([], [{ ja_classificado: true, pontos: DIFICIL }]);
    expect(r.classificadas).toBe(1);
    expect(r.pontos).toBe(DIFICIL);
    const rateio = ratearPontos(DIFICIL, 2);
    expect(rateio.porPessoa * 2).toBe(r.pontos);
  });
});
