/**
 * Aparência procedural dos personagens do Escritório do Ecossistema.
 *
 * A cara de cada sistema sai do `id` dele. Mesmo sistema, mesmo rosto, em
 * qualquer máquina e em qualquer dia — ninguém precisa decorar legenda.
 */

const PELE = ["#f2caa4", "#e2ad80", "#b3784a", "#8a5630"] as const;
const CABELO = ["#241f1c", "#4a2f18", "#7a4d24", "#c9a227", "#6e3b2a", "#2f3a52"] as const;
const TERNO = ["#2f3a52", "#3a3a44", "#4a3b2f", "#2c4a43", "#42304a", "#1f3a5c"] as const;
const GRAVATA = ["#c4463a", "#3f6fc4", "#2f9e69", "#c9a227", "#7a4fc0", "#c95f8f"] as const;
const POLO = ["#3f6fc4", "#c4463a", "#2f9e69", "#2f8ba8", "#d1594f", "#f0c04a", "#7a4fc0", "#e8e3d6"] as const;
const CALCA = ["#343a47", "#454b57", "#2b3546"] as const;

export interface Aparencia {
  pele: string;
  cabelo: string;
  terno: string;
  gravata: string;
  polo: string;
  calca: string;
  estilo: 0 | 1 | 2;
  formal: boolean;
}

/** FNV-1a. Determinístico e estável entre navegadores. */
export function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * `>>>` e não `>>`: com deslocamento aritmético o hash vira negativo e o
 * módulo devolve índice negativo — a paleta some e o personagem não desenha.
 */
export function aparenciaDoSistema(id: string): Aparencia {
  const h = hash(id);
  return {
    pele: PELE[h % PELE.length],
    cabelo: CABELO[(h >>> 3) % CABELO.length],
    terno: TERNO[(h >>> 7) % TERNO.length],
    gravata: GRAVATA[(h >>> 11) % GRAVATA.length],
    polo: POLO[(h >>> 15) % POLO.length],
    calca: CALCA[(h >>> 21) % CALCA.length],
    estilo: ((h >>> 19) % 3) as 0 | 1 | 2,
    formal: ((h >>> 23) & 1) === 0,
  };
}

/** Multiplica o brilho de um hex, saturando em 255. */
export function tom(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * fator));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * fator));
  const b = Math.min(255, Math.round((n & 255) * fator));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
