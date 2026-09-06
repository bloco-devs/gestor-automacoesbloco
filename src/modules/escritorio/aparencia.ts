/**
 * Aparência dos personagens do Escritório do Ecossistema.
 *
 * Todo mundo é o BLINK — o mascote da casa, não boneco genérico. O que
 * distingue um sistema do outro é o ACESSÓRIO, que é fixo e escolhido pelo
 * que aquele sistema faz, e a COR DO CASCO, que sai de um hash do id.
 *
 * Acessório por sistema e não por sala: a sala Operação tem quatro sistemas,
 * e quatro capacetes iguais lado a lado não distinguem nada.
 */

/** Cores de casco. O amarelo e o preto do BLINK nunca mudam — são a marca. */
const CASCOS = [
  "#3f6fc4", "#c4463a", "#2f9e69", "#7a4fc0", "#2f8ba8", "#d1594f",
  "#e0e2e6", "#4a4f5a", "#c98a2f", "#2f6f5c", "#a8447e", "#5a6bd6",
] as const;

export type Acessorio =
  | "capacete" | "headset" | "gravata" | "cracha" | "prancheta" | "caneca"
  | "livro" | "chave" | "megafone" | "maleta" | "rolo" | "predio"
  | "grafico" | "lapis" | "raio" | "engrenagem" | "postit" | "caixa" | "nenhum";

/**
 * Acessório fixo por sistema, amarrado ao ofício de cada um.
 * Sistema novo que o HUB traga cai no sorteio determinístico de `SORTEIO`.
 */
export const ACESSORIO_POR_SISTEMA: Record<string, Acessorio> = {
  "gestao-comercial": "megafone",
  "crm-house": "chave",
  "locacao": "prancheta",
  "processos": "engrenagem",
  "produtividade": "capacete",
  "sucesso-cliente": "headset",
  "atividades": "postit",
  "rh": "caneca",
  "fluxo-caixa": "gravata",
  "captacao": "maleta",
  "nakhon-contratos": "livro",
  "viabilidade": "rolo",
  "incorporacao": "predio",
  "portfolio": "grafico",
  "desenvolvimento-produto": "lapis",
  "automacoes": "raio",
  // nomes do seed, para quando o HUB não responde
  "obra": "capacete",
  "suprimentos": "prancheta",
  "financeiro": "gravata",
  "gestao-projetos": "lapis",
  "hub-bloco-id": "cracha",
  "nakhon": "livro",
};

const SORTEIO: Acessorio[] = [
  "cracha", "prancheta", "caneca", "livro", "chave", "megafone",
  "maleta", "rolo", "predio", "grafico", "lapis", "engrenagem", "postit",
];

export interface Aparencia {
  casco: string;
  acessorio: Acessorio;
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
    casco: CASCOS[h % CASCOS.length],
    acessorio: ACESSORIO_POR_SISTEMA[id] ?? SORTEIO[(h >>> 7) % SORTEIO.length],
  };
}

/** Quem entrega pela porta é um BLINK de fora: casco cinza e uma caixa na mão. */
export function aparenciaDeConector(id: string): Aparencia {
  return { casco: hash(id) % 2 === 0 ? "#7d7768" : "#6f6a5c", acessorio: "caixa" };
}

/** Multiplica o brilho de um hex, saturando em 255. */
export function tom(hex: string, fator: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * fator));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * fator));
  const b = Math.min(255, Math.round((n & 255) * fator));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}
