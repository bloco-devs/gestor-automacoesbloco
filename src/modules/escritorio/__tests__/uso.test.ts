/**
 * Os testes do terceiro eixo: uso humano.
 *
 * O QUE NÃO DÁ PARA TESTAR AQUI: a origem do dado. `pessoas_24h` sai da view
 * `ecossistema_uso` no HUB, que agrega `usuario_acessos.ultimo_login_sso_em`.
 * Não há banco local nem contêiner; o que se testa aqui é a leitura, não a
 * coleta.
 *
 * O que se testa, e é o que importa: que este sinal NÃO se confunde com os
 * outros dois. Uma sala com nove pessoas e zero execução tem de aparecer
 * diferente de uma sala com execução e ninguém dentro — foi exatamente essa
 * troca que fez o Escritório mostrar o andar errado.
 */

import { describe, expect, it } from "vitest";
import { fraseDeUso, pessoasAgora, resumoDeUso, temSinalDeUso } from "../uso";
import type { UsoSistema } from "../dados";

/** O retrato real do HUB em 08/09/2026, como a rota devolveu. */
const HUB: Record<string, UsoSistema> = {
  processos: { pessoas_24h: 9, pessoas_30d: 16, ultimo_login: "2026-09-08T11:28:30.463+00:00" },
  produtividade: { pessoas_24h: 3, pessoas_30d: 11, ultimo_login: "2026-09-08T11:39:59.91+00:00" },
  automacoes: { pessoas_24h: 2, pessoas_30d: 15, ultimo_login: "2026-09-08T12:11:02.503+00:00" },
  "crm-house": { pessoas_24h: 2, pessoas_30d: 4, ultimo_login: "2026-09-08T12:22:55.714+00:00" },
  incorporacao: { pessoas_24h: 2, pessoas_30d: 14, ultimo_login: "2026-09-07T04:56:16.146+00:00" },
  "gestao-comercial": { pessoas_24h: 1, pessoas_30d: 6, ultimo_login: "2026-09-04T19:35:03.377+00:00" },
  rh: { pessoas_24h: 1, pessoas_30d: 11, ultimo_login: "2026-09-04T19:29:01.138+00:00" },
  portfolio: { pessoas_24h: 0, pessoas_30d: 3, ultimo_login: "2026-09-07T04:36:21.321+00:00" },
  captacao: { pessoas_24h: 0, pessoas_30d: 4, ultimo_login: "2026-08-27T11:42:13.735+00:00" },
  atividades: { pessoas_24h: 0, pessoas_30d: 1, ultimo_login: "2026-08-11T14:39:36.446+00:00" },
};
const AGORA = Date.parse("2026-09-08T13:00:00Z");

// ===========================================================================
describe("pessoas na sala", () => {
  it("lê a contagem da janela de 24 h", () => {
    expect(pessoasAgora(HUB.processos)).toBe(9);
    expect(pessoasAgora(HUB.rh)).toBe(1);
    expect(pessoasAgora(HUB.portfolio)).toBe(0);
  });

  it("sem sinal do HUB é zero, não NaN nem negativo", () => {
    expect(pessoasAgora(undefined)).toBe(0);
    expect(pessoasAgora({ pessoas_24h: Number.NaN, pessoas_30d: 0, ultimo_login: null })).toBe(0);
    expect(pessoasAgora({ pessoas_24h: -3, pessoas_30d: 0, ultimo_login: null })).toBe(0);
  });

  /*
   * "Zero pessoas hoje" e "não sei quantas pessoas" são coisas diferentes — a
   * mesma distinção que custou uma correção quando `sem-dados` e
   * `sem-execucao` estavam colapsados num rótulo só.
   */
  it("registro com zero pessoas ainda É sinal; ausência de registro não é", () => {
    expect(temSinalDeUso(HUB.portfolio)).toBe(true);
    expect(pessoasAgora(HUB.portfolio)).toBe(0);
    expect(temSinalDeUso(undefined)).toBe(false);
  });
});

// ===========================================================================
describe("o uso não se confunde com a execução", () => {
  /*
   * A inversão que originou este trabalho, travada em teste para nunca voltar:
   * a sala mais cheia do andar tinha ZERO execução, e a única "trabalhando"
   * estava vazia.
   */
  it("a sala mais cheia é justamente uma das que o HUB reporta sem execução", () => {
    const maisCheia = Object.entries(HUB).sort((a, b) => b[1].pessoas_24h - a[1].pessoas_24h)[0];
    expect(maisCheia[0]).toBe("processos");
    expect(maisCheia[1].pessoas_24h).toBe(9);
    // `portfolio` era o único com execução no retrato, e está vazio
    expect(pessoasAgora(HUB.portfolio)).toBe(0);
  });

  it("os dois eixos são independentes: as quatro combinações existem", () => {
    // gente + sem execução
    expect(pessoasAgora(HUB.processos) > 0).toBe(true);
    // sem gente + com execução
    expect(pessoasAgora(HUB.portfolio) === 0).toBe(true);
    // gente + com execução (rh: 1 pessoa, 1 exec no retrato)
    expect(pessoasAgora(HUB.rh) > 0).toBe(true);
    // sem gente + sem execução
    expect(pessoasAgora(HUB.atividades) === 0).toBe(true);
  });
});

// ===========================================================================
describe("o resumo do rodapé", () => {
  const NOS = Object.keys(HUB).map((id) => ({ id }));

  it("conta salas com gente e a soma de pessoas", () => {
    const r = resumoDeUso(NOS, HUB);
    // processos 9, produtividade 3, automacoes 2, crm-house 2, incorporacao 2,
    // gestao-comercial 1, rh 1 → sete salas
    expect(r.salasComGente).toBe(7);
    expect(r.pessoas).toBe(20);
  });

  it("nó sem sinal não conta e não quebra", () => {
    const r = resumoDeUso([{ id: "processos" }, { id: "inexistente" }], HUB);
    expect(r).toEqual({ salasComGente: 1, pessoas: 9 });
  });

  it("mapa vazio é zero, não NaN", () => {
    expect(resumoDeUso(NOS, {})).toEqual({ salasComGente: 0, pessoas: 0 });
    expect(resumoDeUso([], HUB)).toEqual({ salasComGente: 0, pessoas: 0 });
  });
});

// ===========================================================================
describe("a frase da prévia diz o que a métrica é", () => {
  it("com gente, fala de ACESSO — nunca de trabalho", () => {
    const f = fraseDeUso(HUB.processos, AGORA)!;
    expect(f).toContain("9 pessoas acessaram");
    expect(f).toContain("últimas 24 horas");
    // A palavra que não pode aparecer: login não é trabalho.
    expect(f.toLowerCase()).not.toContain("trabalh");
  });

  it("uma pessoa é singular", () => {
    expect(fraseDeUso(HUB.rh, AGORA)).toContain("1 pessoa acessou");
  });

  it("sem gente hoje, diz quando foi a última entrada", () => {
    const f = fraseDeUso(HUB.portfolio, AGORA)!;
    expect(f).toContain("Ninguém acessou");
    expect(f).toContain("ontem");
  });

  it("entrada antiga é contada em dias", () => {
    // captacao: 27/08, ~12 dias antes de 08/09
    expect(fraseDeUso(HUB.captacao, AGORA)).toMatch(/há \d+ dias/);
  });

  it("sem sinal do HUB não há frase — a tela não inventa", () => {
    expect(fraseDeUso(undefined, AGORA)).toBeNull();
  });

  it("carimbo inválido não vira 'NaN horas'", () => {
    const f = fraseDeUso(
      { pessoas_24h: 2, pessoas_30d: 2, ultimo_login: "data-torta" },
      AGORA,
    )!;
    expect(f).toBe("2 pessoas acessaram nas últimas 24 horas.");
    expect(f).not.toContain("NaN");
  });

  it("entrada recente aparece em horas", () => {
    expect(fraseDeUso(HUB.automacoes, AGORA)).toContain("há menos de uma hora");
  });
});
