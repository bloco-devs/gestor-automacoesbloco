/**
 * Desenho pixel-art do Escritório do Ecossistema.
 *
 * Tudo é retângulo de 1px na grade interna; nada de imagem externa. Quem
 * chama já aplicou a transformação de câmera, então aqui as coordenadas são
 * sempre em pixels internos e inteiros — é isso que mantém o pixel nítido.
 */

import { aparenciaDoSistema, tom, type Aparencia } from "./aparencia";

export const TILE = 16;

/** Altura total do personagem, do topo do cabelo à sola do sapato. */
export const PESSOA_H = 46;
export const PESSOA_W = 22;
/**
 * Distância do topo do personagem até o tampo da mesa.
 *
 * Com 28 o monitor cobria o tronco e sobrava só a cabeça flutuando; 42 deixa
 * cabeça, ombros e peito acima do monitor, como na planta de referência.
 */
export const OFFSET_MESA = 42;

export const MESA_W = 48;
export const MESA_H = 32;

type Ctx = CanvasRenderingContext2D;
const r = (c: Ctx, x: number, y: number, w: number, h: number, cor: string) => {
  c.fillStyle = cor;
  c.fillRect(x, y, w, h);
};

/* ---------------------------------------------------------------- chão --- */

const CHAO_A = "#8fab9f";
const CHAO_B = "#89a598";
const CHAO_LINHA = "#7d9a8d";
const CHAO_MARCA = "#9db8ac";

export function pisoTile(c: Ctx, x: number, y: number) {
  r(c, x, y, TILE, TILE, ((x / TILE + y / TILE) & 1) === 0 ? CHAO_A : CHAO_B);
  r(c, x, y, TILE, 1, CHAO_LINHA);
  r(c, x, y, 1, TILE, CHAO_LINHA);
  // losango nos encontros das juntas — é o que dá a textura da referência
  r(c, x + 14, y + 15, 3, 1, CHAO_MARCA);
  r(c, x + 15, y + 14, 1, 3, CHAO_MARCA);
}

/* -------------------------------------------------------------- paredes --- */

const PAREDE = "#efeade";
const PAREDE_ALTO = "#f8f5ee";
const PAREDE_SOMBRA = "#cfc8b8";
const CONTORNO = "#2b2a26";

/** Parede externa do andar, com contorno escuro como na planta de referência. */
export function paredeExterna(c: Ctx, x: number, y: number, w: number, h: number) {
  r(c, x, y, w, h, CONTORNO);
  r(c, x + 2, y + 2, w - 4, h - 4, PAREDE);
  r(c, x + 2, y + 2, w - 4, 2, PAREDE_ALTO);
  r(c, x + 2, y + h - 4, w - 4, 2, PAREDE_SOMBRA);
}

/** Divisória interna: faixa creme com contorno fino. */
export function divisoria(c: Ctx, x: number, y: number, w: number, h: number) {
  r(c, x, y, w, h, CONTORNO);
  r(c, x + 1, y + 1, w - 2, h - 2, PAREDE);
  if (h >= 6) r(c, x + 1, y + 1, w - 2, 1, PAREDE_ALTO);
  if (w >= 6) r(c, x + 1, y + h - 2, w - 2, 1, PAREDE_SOMBRA);
}

/* ------------------------------------------------------------- adornos --- */

export function relogio(c: Ctx, cx: number, cy: number) {
  disco(c, cx, cy, 6, CONTORNO);
  disco(c, cx, cy, 4, "#f6f3ea");
  r(c, cx, cy - 3, 1, 4, "#3a3f4b");
  r(c, cx, cy, 3, 1, "#c4463a");
}

export function janela(c: Ctx, x: number, y: number) {
  r(c, x, y, 26, 16, "#6f6a5c");
  r(c, x + 2, y + 2, 22, 12, "#a9cadb");
  r(c, x + 2, y + 2, 22, 5, "#c4dfea");
  r(c, x + 12, y + 2, 2, 12, "#6f6a5c");
  r(c, x + 2, y + 7, 22, 2, "#6f6a5c");
  r(c, x + 4, y + 3, 5, 3, "#e4f1f7");
}

export function calendario(c: Ctx, x: number, y: number) {
  r(c, x, y, 16, 18, "#6f6a5c");
  r(c, x + 1, y + 1, 14, 4, "#c4463a");
  r(c, x + 1, y + 5, 14, 12, "#f6f3ea");
  for (let i = 0; i < 3; i++) r(c, x + 3, y + 7 + i * 3, 10, 1, "#c8c2b2");
  r(c, x + 9, y + 10, 2, 2, "#c4463a");
}

export function planta(c: Ctx, x: number, y: number) {
  r(c, x + 3, y + 12, 10, 8, "#e2ded2");
  r(c, x + 3, y + 12, 10, 2, "#f2eee4");
  r(c, x + 4, y + 18, 8, 2, "#c3bcac");
  r(c, x + 6, y + 5, 4, 8, "#3f8f57");
  r(c, x + 2, y + 6, 4, 4, "#4aa367");
  r(c, x + 10, y + 7, 4, 4, "#4aa367");
  r(c, x + 7, y, 3, 6, "#4aa367");
  r(c, x + 3, y + 2, 3, 3, "#3f8f57");
  r(c, x + 11, y + 3, 3, 3, "#3f8f57");
}

export function bebedouro(c: Ctx, x: number, y: number) {
  r(c, x + 2, y, 10, 9, "#bfe2ee");
  r(c, x + 4, y + 1, 4, 5, "#e6f5fa");
  r(c, x, y + 9, 14, 14, "#e2ded2");
  r(c, x + 1, y + 10, 12, 1, "#f2eee4");
  r(c, x + 3, y + 13, 8, 4, "#c3bcac");
  r(c, x + 5, y + 19, 4, 2, "#9b9383");
}

export function maquina(c: Ctx, x: number, y: number) {
  r(c, x, y, 30, 44, CONTORNO);
  r(c, x + 1, y + 1, 28, 42, "#a8dd8a");
  r(c, x + 3, y + 4, 16, 30, "#dff3d5");
  r(c, x + 4, y + 5, 14, 28, "#cfe9c2");
  for (let i = 0; i < 4; i++) r(c, x + 5, y + 7 + i * 7, 12, 4, "#b0d3a0");
  r(c, x + 21, y + 6, 6, 12, "#8cc472");
  r(c, x + 22, y + 8, 4, 2, "#f2efe6");
  r(c, x + 21, y + 24, 6, 10, "#8cc472");
}

export function copa(c: Ctx, x: number, y: number) {
  r(c, x, y + 10, 54, 14, "#b58a56");
  r(c, x, y + 10, 54, 3, "#cda471");
  r(c, x, y + 22, 54, 2, "#8d6a3f");
  r(c, x + 4, y, 12, 12, "#d8d4c8");
  r(c, x + 6, y + 2, 8, 6, "#4a4a52");
  r(c, x + 7, y + 9, 6, 3, "#f2efe6");
  r(c, x + 22, y + 3, 10, 8, "#e2ded2");
  r(c, x + 24, y + 5, 6, 4, "#9db8c4");
  r(c, x + 38, y + 1, 14, 11, "#d8d4c8");
  for (let i = 0; i < 3; i++) r(c, x + 40, y + 3 + i * 3, 10, 2, "#b23b3b");
}

export function mesaReuniao(c: Ctx, x: number, y: number, w: number) {
  r(c, x, y, w, 30, "#c8a06a");
  r(c, x, y, w, 3, "#dcb887");
  r(c, x, y + 27, w, 3, "#9b7440");
  r(c, x + 3, y + 4, w - 6, 22, "#bd9560");
  for (let i = 0; i + 20 < w; i += 20) {
    r(c, x + 6 + i, y - 9, 14, 9, "#8d5f6b");
    r(c, x + 6 + i, y - 9, 14, 2, "#a3737f");
    r(c, x + 6 + i, y + 30, 14, 9, "#8d5f6b");
  }
}

function disco(c: Ctx, cx: number, cy: number, raio: number, cor: string) {
  for (let dy = -raio; dy <= raio; dy++) {
    const dx = Math.floor(Math.sqrt(raio * raio - dy * dy));
    r(c, cx - dx, cy + dy, 2 * dx + 1, 1, cor);
  }
}

/* ---------------------------------------------------------- mesa e cadeira --- */

/** Mesa vista de cima: monitor no fundo, teclado e mouse na frente. */
export function mesa(c: Ctx, x: number, y: number) {
  r(c, x, y + 26, MESA_W, 3, "rgba(0,0,0,.16)");
  r(c, x, y, MESA_W, 3, "#dcb887");
  r(c, x, y + 3, MESA_W, 15, "#c8a06a");
  r(c, x, y + 18, MESA_W, 3, "#8d6a3f");
  r(c, x + 2, y + 21, 5, 8, "#7d5a35");
  r(c, x + MESA_W - 7, y + 21, 5, 8, "#7d5a35");

  r(c, x + 14, y - 12, 20, 15, CONTORNO);   // monitor
  r(c, x + 15, y - 11, 18, 13, "#5c6470");
  r(c, x + 16, y - 10, 16, 11, "#2b3038");
  r(c, x + 17, y - 9, 4, 3, "#7c8896");
  r(c, x + 21, y + 3, 6, 2, "#5c6470");

  r(c, x + 12, y + 8, 18, 5, "#e4e1d8");    // teclado
  r(c, x + 13, y + 9, 16, 3, "#c8c4ba");
  r(c, x + 33, y + 9, 4, 4, "#e4e1d8");     // mouse
}

/** Cadeira-barril, como na planta de referência. */
export function cadeira(c: Ctx, x: number, y: number) {
  r(c, x + 1, y + 17, 20, 2, "rgba(0,0,0,.16)");
  r(c, x + 2, y, 18, 18, "#b8894f");
  r(c, x, y + 3, 22, 12, "#b8894f");
  r(c, x + 2, y + 1, 18, 3, "#cda471");
  r(c, x, y + 4, 22, 2, "#a3773f");
  r(c, x, y + 11, 22, 2, "#a3773f");
  r(c, x + 7, y + 1, 2, 16, "#a3773f");
  r(c, x + 13, y + 1, 2, 16, "#a3773f");
}

/* -------------------------------------------------------------- pessoa --- */

export type Humor = "trabalhando" | "ocioso" | "falha";
export type Direcao = "frente" | "esquerda" | "direita";

export interface PessoaOpts {
  humor: Humor;
  direcao: Direcao;
  /** 0 = parado. 1 e 2 alternam as pernas na caminhada. */
  passo?: 0 | 1 | 2;
  /** Levanta os braços 1px, para a animação de digitar. */
  digitando?: boolean;
  destacado?: boolean;
}

/** Halo quente atrás de quem está ativo. */
export function halo(c: Ctx, cx: number, cy: number) {
  disco(c, cx, cy, 19, "rgba(240,214,140,.22)");
  disco(c, cx, cy, 13, "rgba(240,214,140,.26)");
}

export function pessoa(c: Ctx, x: number, y: number, id: string, opts: PessoaOpts) {
  desenhaPessoa(c, x, y, aparenciaDoSistema(id), opts);
}

export function desenhaPessoa(c: Ctx, x: number, y: number, a: Aparencia, opts: PessoaOpts) {
  const { humor, direcao } = opts;
  const passo = opts.passo ?? 0;
  const peleS = tom(a.pele, 0.86);
  const peleE = tom(a.pele, 0.72);

  if (opts.destacado) {
    // contorno, não bloco: um retângulo preenchido vira uma mancha branca atrás dele
    const luz = "rgba(255,255,255,.85)";
    r(c, x - 1, y - 1, PESSOA_W + 2, 1, luz);
    r(c, x - 1, y + PESSOA_H, PESSOA_W + 2, 1, luz);
    r(c, x - 1, y - 1, 1, PESSOA_H + 2, luz);
    r(c, x + PESSOA_W, y - 1, 1, PESSOA_H + 2, luz);
  }
  r(c, x + 4, y + PESSOA_H, 14, 2, "rgba(0,0,0,.20)");

  // cabelo e cabeça
  r(c, x + 6, y, 10, 1, a.cabelo);
  r(c, x + 5, y + 1, 12, 1, a.cabelo);
  r(c, x + 4, y + 2, 14, 1, a.cabelo);
  r(c, x + 7, y, 6, 1, tom(a.cabelo, 1.35));
  r(c, x + 5, y + 3, 12, 10, a.pele);
  r(c, x + 4, y + 6, 1, 3, a.pele);
  r(c, x + 17, y + 6, 1, 3, a.pele);
  r(c, x + 4, y + 7, 1, 1, peleS);
  r(c, x + 17, y + 7, 1, 1, peleS);
  r(c, x + 5, y + 3, 12, 1, a.cabelo);
  if (a.estilo === 0) {
    r(c, x + 4, y + 3, 2, 3, a.cabelo);
    r(c, x + 16, y + 3, 2, 3, a.cabelo);
  } else if (a.estilo === 1) {
    r(c, x + 5, y + 4, 5, 1, a.cabelo);
    r(c, x + 4, y + 3, 2, 4, a.cabelo);
    r(c, x + 16, y + 3, 2, 3, a.cabelo);
  } else {
    r(c, x + 4, y + 3, 2, 5, a.cabelo);
    r(c, x + 16, y + 3, 2, 5, a.cabelo);
    r(c, x + 5, y + 4, 12, 1, a.cabelo);
  }

  // rosto
  r(c, x + 6, y + 5, 3, 1, a.cabelo);
  r(c, x + 13, y + 5, 3, 1, a.cabelo);
  if (direcao === "frente") {
    r(c, x + 6, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 13, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 7, y + 6, 1, 2, "#2b2f38");
    r(c, x + 14, y + 6, 1, 2, "#2b2f38");
  } else if (direcao === "direita") {
    r(c, x + 7, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 13, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 9, y + 6, 1, 2, "#2b2f38");
    r(c, x + 15, y + 6, 1, 2, "#2b2f38");
  } else {
    r(c, x + 6, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 12, y + 6, 3, 2, "#fbfbf7");
    r(c, x + 6, y + 6, 1, 2, "#2b2f38");
    r(c, x + 12, y + 6, 1, 2, "#2b2f38");
  }
  r(c, x + 10, y + 8, 2, 2, peleS);
  r(c, x + 10, y + 9, 1, 1, peleE);
  if (humor === "falha") {
    r(c, x + 9, y + 11, 4, 1, "#8a4038");
    r(c, x + 9, y + 10, 1, 1, "#8a4038");
    r(c, x + 12, y + 10, 1, 1, "#8a4038");
  } else if (humor === "ocioso") {
    r(c, x + 9, y + 10, 4, 1, "#8a4a3c");
  } else {
    r(c, x + 9, y + 10, 4, 1, "#8a4a3c");
    r(c, x + 8, y + 10, 1, 1, "#8a4a3c");
    r(c, x + 13, y + 10, 1, 1, "#8a4a3c");
    r(c, x + 10, y + 11, 2, 1, "#f6e2d2");
  }
  r(c, x + 6, y + 12, 10, 1, peleS);
  r(c, x + 9, y + 13, 4, 2, a.pele);
  r(c, x + 9, y + 13, 4, 1, peleE);

  // tronco
  const roupa = a.formal ? a.terno : a.polo;
  const roupaE = tom(roupa, 0.78);
  r(c, x + 3, y + 15, 16, 1, roupa);
  r(c, x + 2, y + 16, 18, 18, roupa);
  r(c, x + 2, y + 16, 1, 18, roupaE);
  r(c, x + 19, y + 16, 1, 18, roupaE);
  if (a.formal) {
    r(c, x + 8, y + 15, 6, 1, "#eef1f5");
    r(c, x + 9, y + 16, 4, 2, "#eef1f5");
    r(c, x + 7, y + 16, 2, 4, tom(roupa, 1.18));
    r(c, x + 13, y + 16, 2, 4, tom(roupa, 1.18));
    r(c, x + 9, y + 16, 4, 1, a.gravata);
    r(c, x + 10, y + 17, 2, 9, a.gravata);
    r(c, x + 10, y + 17, 1, 9, tom(a.gravata, 1.2));
  } else {
    r(c, x + 8, y + 15, 6, 1, tom(roupa, 1.3));
    r(c, x + 9, y + 16, 4, 2, tom(roupa, 1.3));
    r(c, x + 10, y + 18, 2, 5, roupaE);
  }

  // braços e mãos
  const dy = opts.digitando ? 1 : 0;
  r(c, x + 2, y + 18 - dy, 4, 12, roupa);
  r(c, x + 16, y + 18 - dy, 4, 12, roupa);
  r(c, x + 3, y + 28 - dy, 4, 3, a.pele);
  r(c, x + 15, y + 28 - dy, 4, 3, a.pele);
  r(c, x + 3, y + 28 - dy, 4, 1, peleS);
  r(c, x + 15, y + 28 - dy, 4, 1, peleS);

  // pernas: só aparecem quando ele está fora da mesa
  const perna1 = passo === 1 ? 1 : 0;
  const perna2 = passo === 2 ? 1 : 0;
  r(c, x + 6, y + 34, 4, 9 - perna1, a.calca);
  r(c, x + 12, y + 34, 4, 9 - perna2, a.calca);
  r(c, x + 10, y + 34, 2, 9, tom(a.calca, 0.8));
  r(c, x + 5, y + 43 - perna1, 5, 3, "#1c1f26");
  r(c, x + 12, y + 43 - perna2, 5, 3, "#1c1f26");
}

/** Alerta vermelho sobre quem está em falha. */
export function alerta(c: Ctx, x: number, y: number) {
  r(c, x, y, 11, 10, CONTORNO);
  r(c, x + 1, y + 1, 9, 8, "#e04a3c");
  r(c, x + 5, y + 2, 1, 4, "#fff");
  r(c, x + 5, y + 7, 1, 1, "#fff");
  r(c, x + 4, y + 10, 3, 3, CONTORNO);
}

/** Porta de conector externo na parede. */
export function porta(c: Ctx, x: number, y: number, ativa: boolean) {
  r(c, x, y, 26, 24, CONTORNO);
  r(c, x + 2, y + 2, 22, 22, ativa ? "#8d6a3f" : "#6f6a5c");
  r(c, x + 2, y + 2, 22, 2, ativa ? "#a3814f" : "#807a6c");
  r(c, x + 5, y + 6, 16, 10, ativa ? "#a9cadb" : "#6f6a5c");
  r(c, x + 5, y + 6, 16, 4, ativa ? "#c4dfea" : "#7d7768");
  r(c, x + 19, y + 18, 3, 3, "#e4e1d8");
}
