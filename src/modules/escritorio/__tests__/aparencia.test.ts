import { describe, expect, it } from "vitest";
import { ACESSORIO_POR_SISTEMA, aparenciaDeConector, aparenciaDoSistema, hash, tom } from "../aparencia";
import { CONECTORES_EXTERNOS_SEED, SISTEMAS_SEED } from "@/lib/ecossistemaSeed";

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

  it("quem entrega pela porta carrega caixa, e só ele", () => {
    expect(aparenciaDeConector("sienge").acessorio).toBe("caixa");
    for (const id of SISTEMAS_HUB) expect(aparenciaDoSistema(id).acessorio).not.toBe("caixa");
  });

  it("hash é sempre positivo", () => {
    for (let i = 0; i < 300; i++) expect(hash(`x${i}`)).toBeGreaterThanOrEqual(0);
  });

  it("tom satura em 255 em vez de estourar o hex", () => {
    expect(tom("#f0f0f0", 2)).toBe("#ffffff");
    expect(tom("#804020", 0.5)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
