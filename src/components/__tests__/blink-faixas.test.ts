import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O vídeo tem duas partes: 0..TRACK_END é olhar, REACTION_START..239 é a reação
 * (cara feliz e pulo) que só toca no clique.
 *
 * O invariante perigoso é o repouso. A faixa de repouso antiga era 222-239, e
 * nesta versão do vídeo esse trecho é exatamente o pulo: sem a separação, o
 * BLINK "descansaria" comemorando, e pularia sozinho no meio do rastreamento.
 *
 * Estes testes leem a tabela do componente e verificam a separação de verdade,
 * não a intenção.
 */
const fonte = readFileSync("src/components/BoasVindas.tsx", "utf8");

function num(nome: string): number {
  const m = fonte.match(new RegExp(`const ${nome} = (\\d+)`));
  if (!m) throw new Error(`não achei ${nome}`);
  return Number(m[1]);
}
function frac(nome: string): number {
  const m = fonte.match(new RegExp(`const ${nome} = ([\\d.]+)`));
  if (!m) throw new Error(`não achei ${nome}`);
  return Number(m[1]);
}

/** Reconstrói a tabela interpolada como o componente faz. */
function gaze(): Array<{ x: number; y: number; mag: number }> {
  const bloco = fonte.slice(
    fonte.indexOf("const GAZE_KEYS"),
    fonte.indexOf("];", fonte.indexOf("const GAZE_KEYS")),
  );
  const keys = [...bloco.matchAll(/\[(\d+), ([+-][\d.]+), ([+-][\d.]+)\]/g)].map(
    (m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const,
  );
  expect(keys.length).toBeGreaterThan(20);
  const N = num("N_FRAMES");
  const TRACK_END = num("TRACK_END");
  const out: Array<{ x: number; y: number; mag: number }> = [];
  let k = 0;
  for (let f = 0; f < N; f++) {
    if (f > TRACK_END) {
      out.push({ x: 0, y: 0, mag: 0 });
      continue;
    }
    while (k < keys.length - 2 && keys[k + 1][0] <= f) k += 1;
    const a = keys[k];
    const b = keys[k + 1] ?? a;
    const span = b[0] - a[0];
    const t = span > 0 ? Math.min(1, Math.max(0, (f - a[0]) / span)) : 0;
    const x = a[1] + (b[1] - a[1]) * t;
    const y = a[2] + (b[2] - a[2]) * t;
    out.push({ x, y, mag: Math.hypot(x, y) });
  }
  return out;
}

describe("faixas do vídeo do BLINK", () => {
  it("a reação vem logo depois do rastreamento, sem vão nem sobreposição", () => {
    expect(num("REACTION_START")).toBe(num("TRACK_END") + 1);
    expect(num("REACTION_START")).toBeLessThan(num("N_FRAMES"));
  });

  it("a faixa de repouso fica inteira dentro do rastreamento — nunca no pulo", () => {
    const G = gaze();
    const REST_MAG = frac("REST_MAG");
    const TRACK_END = num("TRACK_END");
    const repouso = G.map((g, f) => [f, g] as const)
      .filter(([f, g]) => f <= TRACK_END && g.mag < REST_MAG)
      .map(([f]) => f);
    expect(repouso.length).toBeGreaterThan(10);
    expect(Math.max(...repouso)).toBeLessThanOrEqual(TRACK_END);
    expect(Math.min(...repouso)).toBeGreaterThanOrEqual(0);
  });

  it("nenhum quadro da reação tem olhar medido, então não pode ser escolhido", () => {
    const G = gaze();
    for (let f = num("REACTION_START"); f < num("N_FRAMES"); f++) {
      expect(G[f].mag).toBe(0);
    }
  });

  it("a reação tem quadros suficientes para ser uma animação, não um piscar", () => {
    const n = num("N_FRAMES") - num("REACTION_START");
    expect(n).toBeGreaterThanOrEqual(20);
  });
});
