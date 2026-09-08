/**
 * Desenho pixel-art do Escritório do Ecossistema.
 *
 * Tudo é retângulo de 1px na grade interna; nada de imagem externa. Quem
 * chama já aplicou a transformação de câmera, então aqui as coordenadas são
 * sempre em pixels internos e inteiros — é isso que mantém o pixel nítido.
 */

import { aparenciaDeConector, aparenciaDoSistema, tom, type Acessorio, type Aparencia } from "./aparencia";

export const TILE = 16;

/** Altura total do personagem, da antena à sola do pé. */
export const PERSONAGEM_H = 46;
export const PERSONAGEM_W = 22;
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

/* ----------------------------------------------------------- personagem --- */

/** Amarelo e preto do BLINK. Não variam: é a marca. */
const BLINK_AMARELO = "#F2C230";
const BLINK_AM_CLARO = "#ffe07a";
const BLINK_CASCO = "#16171A";
const BLINK_PLACA = "#0B0C0E";
const TRACO = "#1b1c1f";
/** Amarelo fosco do ocioso: acordado, sem o brilho de quem está trabalhando. */
const BLINK_AM_FOSCO = "#8f7420";
/** Sem sinal: a placa do rosto apaga. Não é humor, é ausência de dado. */
const BLINK_APAGADO = "#6f6a5c";
const BLINK_APAGADO_CLARO = "#8f8a7d";

export type Humor = "trabalhando" | "ocioso" | "falha" | "sem-dados";

/**
 * Para onde o BLINK está virado.
 *
 * `costas` existe porque o andar é visto de cima e de frente ao mesmo tempo:
 * quem anda para o fundo da sala (Y diminuindo) estava andando de frente,
 * deslizando de ré. As outras três direções são o mesmo sprite com o olho
 * deslocado 1 px; `costas` é o único que troca de verdade o que se desenha.
 */
export type Direcao = "frente" | "esquerda" | "direita" | "costas";

/**
 * A COR DA PLACA, e por que ela não pode viver só no rosto.
 *
 * `sem-execucao` e `sem-dados` usam o MESMO monitor apagado — está travado em
 * teste. O que separa um do outro na tela é só a placa: acesa em quem não
 * executou, apagada em quem o HUB não conhece. Se o BLINK virar de costas e
 * essa cor ficar para trás, os dois estados viram o mesmo boneco preto e a
 * distinção do commit que os separou desaparece justamente em quem está
 * sentado — que é a maioria do andar.
 *
 * Por isso a cor é função do humor, num lugar só. O rosto usa as duas: a placa
 * como moldura e o traço como elemento aceso. A nuca só tem uma superfície, e
 * usa `corDoTraco` — é a que separa TRÊS estados em vez de dois, porque a
 * placa muda apenas em `sem-dados`. Não é enfeite: é o mesmo dado, na única
 * superfície que sobra quando o rosto vira para o outro lado.
 */
export function corDaPlaca(humor: Humor): string {
  return humor === "sem-dados" ? BLINK_APAGADO : BLINK_AMARELO;
}

/** A cor do traço do rosto — olho, boca, sobrancelha. */
export function corDoTraco(humor: Humor): string {
  return humor === "ocioso"
    ? BLINK_AM_FOSCO
    : humor === "sem-dados"
      ? BLINK_APAGADO_CLARO
      : BLINK_AMARELO;
}

export interface PersonagemOpts {
  humor: Humor;
  direcao: Direcao;
  /** 0 = parado. 1 e 2 alternam as pernas na caminhada. */
  passo?: 0 | 1 | 2;
  /** Levanta os braços 1px, para a animação de digitar. */
  digitando?: boolean;
  /**
   * Sentado: troca as pernas pela cadeira.
   *
   * Não é uma pose "a mais" — é a única forma honesta de sentar nesta
   * perspectiva. Ver `cadeiraAtras`.
   */
  sentado?: boolean;
  destacado?: boolean;
  /** Conector externo: casco cinza e o símbolo do serviço na mão. */
  externo?: boolean;
  /** Cor de casco resolvida pela página, para dois sistemas nunca repetirem. */
  casco?: string;
}

/** Halo quente atrás de quem está ativo. */
export function halo(c: Ctx, cx: number, cy: number) {
  disco(c, cx, cy, 19, "rgba(240,214,140,.22)");
  disco(c, cx, cy, 13, "rgba(240,214,140,.26)");
}

export function personagem(c: Ctx, x: number, y: number, id: string, opts: PersonagemOpts) {
  const base = opts.externo ? aparenciaDeConector(id) : aparenciaDoSistema(id);
  desenhaBlink(c, x, y, opts.casco ? { ...base, casco: opts.casco } : base, opts);
}

/* Cores da cadeira, copiadas de `mobiliario`. Copiadas de propósito: importar
 * `mobiliario` aqui fecharia um ciclo, porque é ele que importa `TILE` daqui. */
const CADEIRA = "#3d4756";
const CADEIRA_LUZ = "#4d596b";
const CADEIRA_SOMBRA = "#2b333e";

/**
 * A CADEIRA QUE FAZ O BLINK SENTAR — e por que ela vive dentro do sprite.
 *
 * Sentar, nesta perspectiva, é um problema de ordem de desenho, e as duas
 * saídas óbvias falham por medida, não por gosto:
 *
 *   - desenhar a mesa DEPOIS do personagem (a ideia de "as pernas vão para
 *     debaixo da mesa") corta o BLINK na cintura: a mesa ocupa 20 px de altura
 *     e o corpo tem 46, então o tronco desaparece e as pernas reaparecem
 *     embaixo. E a mesa por cima tapa o monitor, que é sinal de estado.
 *   - subir o personagem 42 px, para trás do monitor, esconde as pernas — mas
 *     deixa cabeça e peito flutuando acima do monitor, sem nada que leia como
 *     assento. Era o que a constante `OFFSET_MESA` media, e ela nunca chegou a
 *     ser usada por ninguém: saiu daqui junto com a ideia.
 *
 * A saída que sobra é não ter pernas para esconder. Quem está sentado é
 * desenhado com a cadeira ATRÁS do tronco e o assento no lugar das pernas —
 * tudo numa peça, na ordem certa por construção. Nenhuma camada de fora
 * precisa saber que aquele BLINK está sentado.
 *
 * O encosto é 2 px mais largo que o tronco de cada lado: é essa borda que
 * aparece e diz "tem uma cadeira aqui". Igualado ao tronco, ele desaparece
 * atrás do corpo e o BLINK volta a parecer um busto flutuando.
 *
 * É EXPORTADA, e não desenhada de dentro do personagem, por um motivo de
 * movimento: quem trabalha respira 1 px, e a cadeira não. Junto no mesmo
 * sprite, o encosto e a base subiam e desciam com o peito — uma poltrona
 * vibrando. Quem chama desenha a cadeira na posição parada e o corpo na
 * posição que respira. Chame ANTES do personagem: ela fica atrás dele.
 */
export function cadeiraDeTrabalho(c: Ctx, x: number, y: number) {
  r(c, x + 1, y + 42, 20, 2, "rgba(0,0,0,.22)");

  // encosto
  r(c, x + 1, y + 20, 20, 19, TRACO);
  r(c, x + 2, y + 21, 18, 17, CADEIRA);
  r(c, x + 3, y + 22, 16, 3, CADEIRA_LUZ);
  r(c, x + 2, y + 36, 18, 2, CADEIRA_SOMBRA);

  // braços da cadeira
  r(c, x - 1, y + 28, 3, 7, TRACO);
  r(c, x, y + 29, 2, 5, CADEIRA);
  r(c, x + 20, y + 28, 3, 7, TRACO);
  r(c, x + 21, y + 29, 2, 5, CADEIRA);

  // coluna e base em cruz
  r(c, x + 9, y + 39, 4, 3, CADEIRA_SOMBRA);
  r(c, x + 5, y + 41, 12, 2, CADEIRA_SOMBRA);
  r(c, x + 4, y + 42, 3, 1, TRACO);
  r(c, x + 15, y + 42, 3, 1, TRACO);
}

/**
 * O rosto: placa, olhos, sobrancelha e boca.
 *
 * Saiu de dentro de `desenhaBlink` para ter um irmão — `nuca` — e para as duas
 * versões da cabeça ficarem lado a lado, onde é impossível mexer numa e
 * esquecer a outra.
 */
function rosto(c: Ctx, x: number, y: number, humor: Humor, direcao: Direcao) {
  r(c, x + 5, y + 5, 12, 12, corDaPlaca(humor));
  r(c, x + 6, y + 6, 10, 10, BLINK_PLACA);

  // Olho sempre ABERTO, nos quatro estados. O olho reduzido a uma listra
  // fazia o BLINK parecer desligado, e "sem dado" não é o mesmo que dormindo.
  const desvio = direcao === "direita" ? 1 : direcao === "esquerda" ? -1 : 0;
  const olho = corDoTraco(humor);
  const topoOlho = humor === "falha" ? y + 9 : y + 8;
  r(c, x + 7 + desvio, topoOlho, 3, 3, olho);
  r(c, x + 12 + desvio, topoOlho, 3, 3, olho);
  if (humor === "trabalhando") {
    r(c, x + 7 + desvio, y + 8, 1, 1, BLINK_AM_CLARO);
    r(c, x + 12 + desvio, y + 8, 1, 1, BLINK_AM_CLARO);
  }
  // sobrancelha inclinada: é o que diz "tem coisa errada" sem fechar o olho
  if (humor === "falha") {
    r(c, x + 7, y + 7, 2, 1, olho);
    r(c, x + 9, y + 8, 1, 1, olho);
    r(c, x + 13, y + 8, 1, 1, olho);
    r(c, x + 14, y + 7, 2, 1, olho);
  }

  // boca
  if (humor === "falha") {
    r(c, x + 9, y + 13, 4, 1, olho);
    r(c, x + 8, y + 14, 1, 1, olho);
    r(c, x + 13, y + 14, 1, 1, olho);
  } else if (humor === "sem-dados") {
    r(c, x + 9, y + 14, 4, 1, olho);
  } else {
    r(c, x + 9, y + 14, 4, 1, olho);
    r(c, x + 8, y + 13, 1, 1, olho);
    r(c, x + 13, y + 13, 1, 1, olho);
  }
}

/**
 * A nuca: a cabeça vista por trás.
 *
 * Nada de rosto — a placa amarela é a FRENTE do casco, e desenhá-la nos dois
 * lados faria uma cabeça com dois rostos. O que se vê aqui é o casco fechado,
 * a emenda vertical do capacete e a faixa de refrigeração.
 *
 * A faixa é o único ponto colorido, e não por estética: ela carrega a MESMA
 * cor da placa (ver `corDaPlaca`). É o que mantém `sem-execucao` distinguível
 * de `sem-dados` em quem está sentado de costas, já que o monitor dos dois é
 * igual. Apagar a faixa junto com o rosto seria perder o dado, não a vista.
 */
function nuca(c: Ctx, x: number, y: number, humor: Humor) {
  // casco fechado, um tom acima do contorno para a cabeça não virar um borrão
  r(c, x + 5, y + 5, 12, 12, "#1f2126");
  r(c, x + 5, y + 5, 12, 1, "#2b2e34");

  /*
   * A emenda vai só até a metade, e a faixa atravessa INTEIRA.
   *
   * A primeira versão tinha duas faixas curtas, uma de cada lado da emenda, na
   * altura dos olhos — e o resultado era uma cabeça com dois rostos: de longe
   * lia como olhos fechados, e o BLINK parecia dormindo justamente quando
   * estava trabalhando. Uma faixa única e contínua, embaixo, não tem como ler
   * como par de olhos.
   */
  r(c, x + 10, y + 5, 2, 8, "#141518");
  r(c, x + 5, y + 16, 12, 1, "#141518");

  // faixa de refrigeração — carrega a cor do estado
  r(c, x + 5, y + 13, 12, 3, corDoTraco(humor));
  if (humor === "trabalhando") r(c, x + 5, y + 13, 12, 1, BLINK_AM_CLARO);
}

export function desenhaBlink(c: Ctx, x: number, y: number, a: Aparencia, opts: PersonagemOpts) {
  const { humor, direcao } = opts;
  const passo = opts.passo ?? 0;
  const cascoE = tom(a.casco, 0.72);
  const cascoC = tom(a.casco, 1.18);
  const naCabeca = a.acessorio === "capacete" || a.acessorio === "headset";

  if (opts.destacado) {
    const luz = "rgba(255,255,255,.85)";
    r(c, x - 1, y - 1, PERSONAGEM_W + 2, 1, luz);
    r(c, x - 1, y + PERSONAGEM_H, PERSONAGEM_W + 2, 1, luz);
    r(c, x - 1, y - 1, 1, PERSONAGEM_H + 2, luz);
    r(c, x + PERSONAGEM_W, y - 1, 1, PERSONAGEM_H + 2, luz);
  }
  // Sentado não projeta sombra no chão: a cadeira já tem a dela, e quem a
  // desenha é quem desenha a cadeira.
  if (!opts.sentado) r(c, x + 4, y + PERSONAGEM_H, 14, 2, "rgba(0,0,0,.22)");

  // antenas — o capacete e o headset ocupam o lugar delas
  if (!naCabeca) {
    r(c, x + 6, y, 1, 3, BLINK_AMARELO);
    r(c, x + 5, y, 2, 1, BLINK_AMARELO);
    r(c, x + 15, y, 1, 3, BLINK_AMARELO);
    r(c, x + 15, y, 2, 1, BLINK_AMARELO);
  }

  // cabeça
  r(c, x + 5, y + 2, 12, 1, BLINK_CASCO);
  r(c, x + 4, y + 3, 14, 1, BLINK_CASCO);
  r(c, x + 3, y + 4, 16, 14, BLINK_CASCO);
  r(c, x + 4, y + 18, 14, 1, BLINK_CASCO);
  r(c, x + 5, y + 19, 12, 1, BLINK_CASCO);
  r(c, x + 4, y + 4, 16, 1, "#24262b");

  // protetores de ouvido
  if (a.acessorio !== "headset") {
    r(c, x + 1, y + 8, 2, 5, BLINK_AMARELO);
    r(c, x + 1, y + 8, 2, 1, BLINK_AM_CLARO);
    r(c, x + 19, y + 8, 2, 5, BLINK_AMARELO);
    r(c, x + 19, y + 8, 2, 1, BLINK_AM_CLARO);
  }

  if (direcao === "costas") nuca(c, x, y, humor);
  else rosto(c, x, y, humor, direcao);

  // pescoço e tronco
  r(c, x + 9, y + 20, 4, 1, "#24262b");
  r(c, x + 4, y + 21, 14, 13, a.casco);
  r(c, x + 4, y + 21, 14, 1, cascoC);
  r(c, x + 4, y + 33, 14, 1, cascoE);
  r(c, x + 4, y + 21, 1, 13, cascoE);
  r(c, x + 17, y + 21, 1, 13, cascoE);
  if (direcao === "costas") {
    // Sem emblema: o emblema é do peito. Por trás aparece a coluna do casco.
    r(c, x + 10, y + 22, 2, 12, cascoE);
    r(c, x + 7, y + 26, 8, 1, tom(a.casco, 0.9));
    r(c, x + 7, y + 29, 8, 1, tom(a.casco, 0.9));
  } else {
    r(c, x + 8, y + 24, 6, 5, tom(a.casco, 0.85));
    r(c, x + 9, y + 25, 4, 3, BLINK_AMARELO);
  }

  // braços
  const dy = opts.digitando ? 1 : 0;
  r(c, x + 2, y + 22 - dy, 2, 10, a.casco);
  r(c, x + 18, y + 22 - dy, 2, 10, a.casco);
  r(c, x + 2, y + 30 - dy, 2, 3, BLINK_CASCO);
  r(c, x + 18, y + 30 - dy, 2, 3, BLINK_CASCO);

  // pernas — quem está sentado não tem: o assento está no lugar delas
  if (!opts.sentado) {
    const p1 = passo === 1 ? 1 : 0;
    const p2 = passo === 2 ? 1 : 0;
    r(c, x + 6, y + 34, 4, 9 - p1, BLINK_CASCO);
    r(c, x + 12, y + 34, 4, 9 - p2, BLINK_CASCO);
    r(c, x + 5, y + 43 - p1, 6, 3, "#0d0e10");
    r(c, x + 11, y + 43 - p2, 6, 3, "#0d0e10");
  }

  acessorio(c, x, y, a.acessorio, opts);
}

/* ---------------------------------------------------------- acessórios --- */

type Parte = [number, number, number, number];

/**
 * Desenha o contorno de TODAS as partes antes de pintar QUALQUER uma.
 *
 * Parte por parte, o contorno da peça seguinte risca a peça anterior e o
 * objeto vira um borrão. É o contorno que faz o acessório se separar do casco
 * e do chão — sem ele, a 2x, ninguém reconhece um crachá.
 */
function comContorno(c: Ctx, partes: Parte[], cor: string) {
  for (const [px, py, pw, ph] of partes) r(c, px - 1, py - 1, pw + 2, ph + 2, TRACO);
  for (const [px, py, pw, ph] of partes) r(c, px, py, pw, ph, cor);
}

/**
 * As peças de PEITO — o que existe só na frente do casco.
 *
 * Gravata e crachá pendem do peito; desenhá-las nas costas seria uma gravata
 * saindo da nuca. Some junto com o rosto, e é uma perda real: o acessório é
 * marca de identidade, não decoração. Quem está de costas se identifica pela
 * cor do casco e pela etiqueta da mesa.
 */
const SO_DE_FRENTE = new Set<Acessorio>(["gravata", "cracha"]);

/**
 * O que fica na CABEÇA — o único acessório que sobrevive à cadeira.
 *
 * Todo o resto é objeto de mão, e mão de quem está sentado está no teclado.
 * Desenhado, o objeto fica pairando ao lado do braço da cadeira, sem mão
 * nenhuma o segurando. A identidade de quem está sentado vem da cor do casco
 * e da etiqueta da mesa, que só aparece quando há alguém nela.
 */
const NA_CABECA = new Set<Acessorio>(["capacete", "headset"]);

function acessorio(c: Ctx, x: number, y: number, tipo: Acessorio, opts: PersonagemOpts) {
  const costas = opts.direcao === "costas";
  if (costas && SO_DE_FRENTE.has(tipo)) return;
  if (opts.sentado && !NA_CABECA.has(tipo)) return;

  // mão direita: o objeto fica ao lado do corpo, onde nada o encobre
  const bx = x + 20;
  const by = y + 23;

  switch (tipo) {
    case "capacete": {
      comContorno(c, [[x + 3, y - 3, 16, 6]], "#f0a52a");
      r(c, x + 4, y - 3, 14, 2, "#ffc85e");
      comContorno(c, [[x + 1, y + 2, 20, 3]], "#d98c1c");
      r(c, x + 1, y + 2, 20, 1, "#f0a52a");
      break;
    }
    case "headset": {
      comContorno(c, [[x + 4, y - 1, 14, 3]], "#4a505c");
      comContorno(c, [[x, y + 6, 4, 9], [x + 18, y + 6, 4, 9]], "#3a3f4b");
      r(c, x + 1, y + 8, 2, 5, "#5c6470");
      r(c, x + 19, y + 8, 2, 5, "#5c6470");
      // a haste e a espuma do microfone só existem na frente
      if (!costas) {
        comContorno(c, [[x + 2, y + 15, 2, 3], [x + 4, y + 17, 5, 2]], "#3a3f4b");
        comContorno(c, [[x + 9, y + 16, 3, 3]], "#c4463a");
      }
      break;
    }
    case "gravata": {
      comContorno(c, [[x + 9, y + 20, 5, 4], [x + 10, y + 24, 3, 9]], "#c4463a");
      r(c, x + 10, y + 21, 3, 2, "#d1594f");
      r(c, x + 10, y + 25, 3, 5, "#d1594f");
      break;
    }
    case "cracha": {
      r(c, x + 7, y + 20, 1, 5, "#2b2f38");
      r(c, x + 14, y + 20, 1, 5, "#2b2f38");
      comContorno(c, [[x + 7, y + 25, 9, 11]], "#f4f1e8");
      comContorno(c, [[x + 8, y + 26, 3, 4]], "#8fa6b8");
      r(c, x + 12, y + 27, 3, 1, "#9aa1ab");
      r(c, x + 12, y + 29, 2, 1, "#9aa1ab");
      r(c, x + 8, y + 32, 7, 1, "#9aa1ab");
      r(c, x + 8, y + 34, 5, 1, "#c8c4ba");
      break;
    }
    case "prancheta": {
      comContorno(c, [[bx, by, 11, 14]], "#b5834e");
      comContorno(c, [[bx + 1, by + 3, 9, 10]], "#f4f1e8");
      comContorno(c, [[bx + 3, by - 2, 5, 3]], "#c7ccd4");
      for (let i = 0; i < 3; i++) r(c, bx + 3, by + 5 + i * 3, 6, 1, "#9aa1ab");
      break;
    }
    case "caneca": {
      comContorno(c, [[bx + 9, by + 6, 3, 5]], "#e2ded2");
      comContorno(c, [[bx, by + 3, 9, 11]], "#f4f1e8");
      r(c, bx, by + 7, 9, 2, "#c4463a");
      r(c, bx + 1, by + 4, 3, 1, "#ffffff");
      r(c, bx + 2, by, 1, 3, "#d8d4c8");
      r(c, bx + 6, by - 1, 1, 3, "#d8d4c8");
      break;
    }
    case "livro": {
      comContorno(c, [[bx, by + 3, 12, 10]], "#8d4a3c");
      r(c, bx + 5, by + 3, 2, 10, "#6f3a2e");
      r(c, bx, by + 11, 12, 2, "#f4f1e8");
      r(c, bx + 1, by + 5, 3, 1, "#e0c68a");
      r(c, bx + 8, by + 5, 3, 1, "#e0c68a");
      break;
    }
    case "chave": {
      comContorno(c, [[bx, by + 2, 7, 7], [bx + 6, by + 4, 8, 3]], "#d9b23c");
      r(c, bx + 2, by + 4, 3, 3, TRACO);
      comContorno(c, [[bx + 11, by + 7, 2, 3], [bx + 8, by + 7, 2, 2]], "#d9b23c");
      break;
    }
    case "megafone": {
      // cone de verdade: abre da esquerda para a direita, senão vira um bloco vermelho
      comContorno(
        c,
        [[bx + 1, by + 5, 4, 4], [bx + 5, by + 3, 3, 8], [bx + 8, by + 1, 3, 12]],
        "#c4463a",
      );
      r(c, bx + 9, by + 1, 2, 12, "#e07a6e");
      r(c, bx + 5, by + 4, 3, 2, "#d1594f");
      comContorno(c, [[bx + 2, by + 9, 3, 4]], "#3a3f4b");
      break;
    }
    case "maleta": {
      comContorno(c, [[bx + 3, by + 1, 5, 3]], "#4a3524");
      comContorno(c, [[bx, by + 4, 12, 9]], "#6b4a2f");
      r(c, bx, by + 7, 12, 1, "#523720");
      comContorno(c, [[bx + 5, by + 6, 3, 3]], "#d9b23c");
      break;
    }
    case "rolo": {
      // planta aberta, não tubo enrolado: enrolada não se distingue de um cartão
      comContorno(c, [[bx, by + 1, 12, 13]], "#cfe3f0");
      r(c, bx, by + 1, 2, 13, "#8fb6cf");
      r(c, bx + 3, by + 3, 7, 6, "#4a7fa3");
      r(c, bx + 4, by + 4, 5, 4, "#cfe3f0");
      r(c, bx + 6, by + 3, 1, 6, "#4a7fa3");
      r(c, bx + 3, by + 11, 8, 1, "#4a7fa3");
      break;
    }
    case "predio": {
      comContorno(c, [[bx, by - 1, 10, 15]], "#b8bec6");
      r(c, bx + 1, by, 8, 1, "#d2d7dd");
      for (let f = 0; f < 4; f++) {
        r(c, bx + 2, by + 2 + f * 3, 2, 2, "#4a5560");
        r(c, bx + 6, by + 2 + f * 3, 2, 2, "#4a5560");
      }
      break;
    }
    case "grafico": {
      comContorno(c, [[bx, by, 12, 13]], "#f4f1e8");
      r(c, bx + 2, by + 10, 8, 1, "#9aa1ab");
      r(c, bx + 2, by + 6, 2, 4, "#3f6fc4");
      r(c, bx + 5, by + 3, 2, 7, "#2f9e69");
      r(c, bx + 8, by + 5, 2, 5, "#c4463a");
      break;
    }
    case "lapis": {
      comContorno(c, [[bx + 3, by, 4, 11]], "#f0c04a");
      r(c, bx + 4, by, 1, 11, "#ffd978");
      comContorno(c, [[bx + 3, by - 3, 4, 3]], "#d1594f");
      comContorno(c, [[bx + 3, by + 11, 4, 3]], "#d9a06a");
      r(c, bx + 4, by + 13, 2, 1, "#2b2f38");
      break;
    }
    case "raio": {
      comContorno(
        c,
        [[bx + 4, by, 4, 5], [bx + 2, by + 4, 5, 4], [bx + 4, by + 7, 4, 4], [bx + 2, by + 10, 4, 4]],
        BLINK_AMARELO,
      );
      r(c, bx + 5, by + 1, 1, 3, BLINK_AM_CLARO);
      break;
    }
    case "engrenagem": {
      comContorno(
        c,
        [[bx + 1, by + 1, 9, 9], [bx + 4, by - 1, 3, 2], [bx + 4, by + 10, 3, 2], [bx - 1, by + 4, 2, 3], [bx + 10, by + 4, 2, 3]],
        "#9aa4b0",
      );
      r(c, bx + 2, by + 2, 7, 1, "#b8c0c9");
      r(c, bx + 4, by + 4, 3, 3, TRACO);
      break;
    }
    case "postit": {
      comContorno(c, [[bx, by + 2, 10, 10]], "#f0d84a");
      r(c, bx + 2, by + 4, 6, 1, "#c9b23c");
      r(c, bx + 2, by + 6, 6, 1, "#c9b23c");
      r(c, bx + 2, by + 8, 4, 1, "#c9b23c");
      r(c, bx + 7, by + 9, 3, 3, "#d9c23f");
      break;
    }
    case "zap": {
      comContorno(c, [[bx, by + 2, 12, 10], [bx + 2, by + 11, 3, 3]], "#25D366");
      r(c, bx + 3, by + 4, 6, 2, "#f2fbf5");
      r(c, bx + 3, by + 7, 4, 2, "#f2fbf5");
      break;
    }
    case "envelope": {
      comContorno(c, [[bx, by + 3, 12, 9]], "#f4f1e8");
      // aba em V, desenhada em degrau — sem ela era só um retângulo branco
      for (let i = 0; i < 5; i++) {
        r(c, bx + 1 + i, by + 4 + i, 1, 1, "#8f8a7d");
        r(c, bx + 10 - i, by + 4 + i, 1, 1, "#8f8a7d");
      }
      r(c, bx + 1, by + 9, 4, 1, "#c8c4ba");
      r(c, bx + 7, by + 9, 4, 1, "#c8c4ba");
      break;
    }
    case "drive": {
      // Triângulo do Google Drive, montado linha a linha: como três blocos
      // soltos não lia como triângulo nenhum.
      for (let linha = 0; linha < 6; linha++) {
        const largura = 2 + linha * 2;
        const x0 = bx + 6 - linha;
        r(c, x0 - 1, by + 1 + linha, largura + 2, 1, TRACO);
        r(c, x0, by + 1 + linha, largura, 1, linha < 4 ? "#4285F4" : "#34A853");
      }
      for (let linha = 0; linha < 4; linha++) {
        r(c, bx + 7 + linha, by + 3 + linha, 12 - 8 - linha < 0 ? 1 : 4 - linha, 1, "#FBBC04");
      }
      r(c, bx - 1, by + 7, 14, 3, TRACO);
      r(c, bx, by + 7, 12, 2, "#34A853");
      break;
    }
    case "lupa": {
      // Lente redonda com aro grosso e cabo na diagonal: o quadrado com
      // rabinho não lia como lupa.
      disco(c, bx + 5, by + 5, 5, TRACO);
      disco(c, bx + 5, by + 5, 4, "#5c6470");
      disco(c, bx + 5, by + 5, 3, "#d8ecf5");
      r(c, bx + 3, by + 3, 2, 1, "#ffffff");
      comContorno(c, [[bx + 8, by + 8, 2, 2], [bx + 9, by + 9, 2, 2], [bx + 10, by + 10, 3, 3]], "#4a505c");
      break;
    }
    case "canetaAssina": {
      comContorno(c, [[bx, by + 8, 12, 5]], "#f4f1e8");
      r(c, bx + 2, by + 10, 8, 1, "#9aa1ab");
      comContorno(c, [[bx + 6, by, 3, 8]], "#3f6fc4");
      comContorno(c, [[bx + 6, by + 8, 3, 2]], "#2b2f38");
      break;
    }
    case "ingresso": {
      comContorno(c, [[bx, by + 3, 12, 8]], "#f0863a");
      r(c, bx + 5, by + 3, 2, 8, "#c96a26");
      r(c, bx + 1, by + 5, 3, 1, "#fbe3d2");
      r(c, bx + 8, by + 5, 3, 1, "#fbe3d2");
      r(c, bx + 1, by + 8, 3, 1, "#fbe3d2");
      break;
    }
    case "nos": {
      // nós ligados, na cor do n8n
      comContorno(c, [[bx, by + 1, 4, 4], [bx + 8, by + 1, 4, 4], [bx + 4, by + 8, 4, 4]], "#EA4B71");
      r(c, bx + 4, by + 2, 4, 1, "#f7a9bc");
      r(c, bx + 2, by + 5, 1, 3, "#f7a9bc");
      r(c, bx + 9, by + 5, 1, 3, "#f7a9bc");
      break;
    }
    case "coracao": {
      comContorno(c, [[bx + 1, by + 2, 4, 4], [bx + 7, by + 2, 4, 4], [bx + 1, by + 5, 10, 3], [bx + 3, by + 8, 6, 2], [bx + 5, by + 10, 2, 2]], "#e8548c");
      r(c, bx + 2, by + 3, 2, 2, "#f8a3c2");
      break;
    }
    case "documentoId": {
      comContorno(c, [[bx, by + 2, 12, 10]], "#f4f1e8");
      comContorno(c, [[bx + 1, by + 4, 4, 5]], "#8fa6b8");
      r(c, bx + 7, by + 4, 4, 1, "#9aa1ab");
      r(c, bx + 7, by + 6, 4, 1, "#9aa1ab");
      r(c, bx + 1, by + 10, 10, 1, "#c8c4ba");
      break;
    }
    case "placaVenda": {
      comContorno(c, [[bx + 5, by + 6, 2, 7]], "#8d8576");
      comContorno(c, [[bx, by, 12, 7]], "#f4f1e8");
      r(c, bx + 1, by + 1, 10, 2, "#c4463a");
      r(c, bx + 2, by + 4, 8, 1, "#9aa1ab");
      break;
    }
    case "banco": {
      comContorno(c, [[bx + 1, by + 1, 10, 11]], "#5c7fa8");
      r(c, bx + 1, by + 1, 10, 2, "#8fb0d0");
      r(c, bx + 1, by + 5, 10, 1, "#3f5f80");
      r(c, bx + 1, by + 8, 10, 1, "#3f5f80");
      break;
    }
    case "bancoLote": {
      comContorno(c, [[bx, by + 1, 8, 11]], "#5c7fa8");
      r(c, bx, by + 1, 8, 2, "#8fb0d0");
      r(c, bx, by + 5, 8, 1, "#3f5f80");
      r(c, bx, by + 8, 8, 1, "#3f5f80");
      comContorno(c, [[bx + 9, by + 5, 4, 2], [bx + 11, by + 3, 2, 6]], "#f0c04a");
      break;
    }
    case "cronograma": {
      comContorno(c, [[bx, by + 1, 12, 11]], "#f4f1e8");
      r(c, bx + 1, by + 3, 6, 2, "#3f6fc4");
      r(c, bx + 3, by + 6, 7, 2, "#2f9e69");
      r(c, bx + 2, by + 9, 5, 2, "#c46a2f");
      break;
    }
    /*
     * Marcas enviadas pelo Bloco, redesenhadas em 12x13 px.
     * Não é o arquivo original reduzido — nesse tamanho o vetor vira borrão.
     * É a silhueta e a cor da marca, redesenhadas pixel a pixel.
     */
    /*
     * Marca em 16x16, não 12x13.
     *
     * A 12 px a letra vira mancha: o "ö" do Órulo lia como "d" e o "a" do
     * Autentique como uma cunha. Quatro pixels a mais em cada lado é o que
     * separa "logo" de "quadradinho colorido".
     */
    /*
     * Marca em 14x14, encostada no corpo.
     *
     * A 12 a letra virava mancha; a 16 o selo ficava quase do tamanho do
     * BLINK. 14 é onde a marca ainda lê sem roubar a cena.
     */
    /*
     * Marca em 10x10.
     *
     * Passou por 12 (letra virava mancha), 16 (selo do tamanho do BLINK) e 14
     * (ainda dominava). Em 10 ela fica do porte dos outros acessórios — que é
     * o que sempre coube ao lado do corpo sem roubar a cena.
     */
    case "marcaSienge": {
      comContorno(c, [[bx, by + 3, 9, 9]], "#ffffff");
      const vermelho = "#E30613";
      r(c, bx + 1, by + 4, 7, 2, vermelho);
      r(c, bx + 1, by + 6, 3, 1, vermelho);
      r(c, bx + 1, by + 7, 7, 2, vermelho);
      r(c, bx + 5, by + 9, 3, 1, vermelho);
      r(c, bx + 1, by + 10, 7, 1, vermelho);
      r(c, bx + 4, by + 5, 2, 2, "#ffffff");
      break;
    }
    case "marcaOrulo": {
      comContorno(c, [[bx, by + 3, 9, 9]], "#0037FF");
      r(c, bx + 1, by + 6, 5, 5, "#ffffff");
      r(c, bx + 3, by + 8, 2, 2, "#0037FF");
      r(c, bx + 6, by + 4, 2, 2, "#ffffff");
      break;
    }
    case "marcaSympla": {
      comContorno(c, [[bx, by + 3, 9, 9]], "#00A2FF");
      r(c, bx + 2, by + 7, 5, 1, "#ffffff");
      r(c, bx + 1, by + 8, 2, 1, "#ffffff");
      r(c, bx + 4, by + 9, 4, 1, "#ffffff");
      r(c, bx + 1, by + 10, 5, 1, "#ffffff");
      r(c, bx + 5, by + 4, 3, 3, "#ffffff");
      r(c, bx + 2, by + 5, 2, 2, "#ffffff");
      break;
    }
    case "marcaResend": {
      comContorno(c, [[bx, by + 3, 9, 9]], "#ffffff");
      r(c, bx + 1, by + 4, 5, 2, "#000000");
      r(c, bx + 1, by + 4, 2, 8, "#000000");
      r(c, bx + 5, by + 5, 2, 2, "#000000");
      r(c, bx + 1, by + 7, 5, 2, "#000000");
      r(c, bx + 4, by + 9, 2, 1, "#000000");
      r(c, bx + 5, by + 10, 2, 2, "#000000");
      break;
    }
    case "caixa": {
      comContorno(c, [[bx, by + 3, 12, 10]], "#c69a63");
      r(c, bx + 5, by + 3, 2, 10, "#a3773f");
      r(c, bx, by + 6, 12, 2, "#a3773f");
      r(c, bx, by + 3, 12, 1, "#dcb887");
      break;
    }
    case "nenhum":
      break;
  }
}

/* ------------------------------------------------------- avisos e portas --- */

/** Alerta vermelho sobre quem está em falha. */
export function alerta(c: Ctx, x: number, y: number) {
  r(c, x, y, 11, 10, TRACO);
  r(c, x + 1, y + 1, 9, 8, "#e04a3c");
  r(c, x + 5, y + 2, 1, 4, "#fff");
  r(c, x + 5, y + 7, 1, 1, "#fff");
  r(c, x + 4, y + 10, 3, 3, TRACO);
}

/** Porta de conector externo na parede: por onde entra quem é de fora. */
export function porta(c: Ctx, x: number, y: number, ativa: boolean) {
  r(c, x, y, 26, 24, TRACO);
  r(c, x + 2, y + 2, 22, 22, ativa ? "#8d6a3f" : "#6f6a5c");
  r(c, x + 2, y + 2, 22, 2, ativa ? "#a3814f" : "#807a6c");
  r(c, x + 5, y + 6, 16, 10, ativa ? "#a9cadb" : "#6f6a5c");
  r(c, x + 5, y + 6, 16, 4, ativa ? "#c4dfea" : "#7d7768");
  r(c, x + 19, y + 18, 3, 3, "#e4e1d8");
}

/* ------------------------------------------------- mobília de ambiente --- */

/** Quadro branco na parede da sala. */
export function quadroBranco(c: Ctx, x: number, y: number) {
  r(c, x, y, 30, 11, TRACO);
  r(c, x + 1, y + 1, 28, 9, "#f4f1e8");
  r(c, x + 3, y + 3, 11, 2, "#3f6fc4");
  r(c, x + 3, y + 6, 17, 2, "#c4463a");
  r(c, x + 16, y + 3, 8, 2, "#2f9e69");
}

/** Quadro decorativo. */
export function quadro(c: Ctx, x: number, y: number, cor: string) {
  r(c, x, y, 14, 11, "#7d5a35");
  r(c, x + 1, y + 1, 12, 9, "#f2efe6");
  r(c, x + 3, y + 3, 8, 5, cor);
}

/** Arquivo de duas gavetas. */
export function arquivo(c: Ctx, x: number, y: number) {
  r(c, x, y, 16, 20, TRACO);
  r(c, x + 1, y + 1, 14, 18, "#8d8272");
  r(c, x + 1, y + 1, 14, 2, "#a2988a");
  r(c, x + 2, y + 5, 12, 6, "#7a7062");
  r(c, x + 2, y + 12, 12, 6, "#7a7062");
  r(c, x + 6, y + 7, 4, 1, "#cfc7b8");
  r(c, x + 6, y + 14, 4, 1, "#cfc7b8");
}

/** Impressora de chão. */
export function impressora(c: Ctx, x: number, y: number) {
  r(c, x, y, 20, 16, TRACO);
  r(c, x + 1, y + 1, 18, 14, "#8f8a7d");
  r(c, x + 3, y + 3, 14, 5, "#5c6470");
  r(c, x + 3, y + 10, 14, 4, "#f4f1e8");
  r(c, x + 5, y + 11, 10, 1, "#c8c4ba");
}

/** Banco comprido de corredor. */
export function banco(c: Ctx, x: number, y: number) {
  r(c, x, y, 30, 12, TRACO);
  r(c, x + 1, y + 1, 28, 10, "#a3773f");
  r(c, x + 1, y + 1, 28, 3, "#bb8b50");
  r(c, x + 2, y + 11, 4, 4, "#6d4c2c");
  r(c, x + 24, y + 11, 4, 4, "#6d4c2c");
}

/** Vaso alto, para quebrar corredor comprido. */
export function vasoAlto(c: Ctx, x: number, y: number) {
  r(c, x + 4, y + 16, 12, 10, "#b3653f");
  r(c, x + 4, y + 16, 12, 2, "#c9784f");
  r(c, x + 6, y + 6, 8, 11, "#2f7a4a");
  r(c, x + 2, y + 9, 5, 6, "#39905a");
  r(c, x + 13, y + 8, 5, 6, "#39905a");
  r(c, x + 8, y, 4, 8, "#39905a");
  r(c, x + 4, y + 3, 4, 4, "#2f7a4a");
}

/** Sofá de espera, visto de frente como o resto da mobília. */
export function sofa(c: Ctx, x: number, y: number) {
  r(c, x, y, 44, 20, TRACO);
  r(c, x + 1, y + 1, 42, 18, "#8d5f6b");
  r(c, x + 1, y + 1, 42, 4, "#a3737f");
  r(c, x + 3, y + 7, 17, 10, "#a3737f");
  r(c, x + 24, y + 7, 17, 10, "#a3737f");
  r(c, x + 1, y + 19, 6, 4, "#5f3f48");
  r(c, x + 37, y + 19, 6, 4, "#5f3f48");
}

/** Estante de livros. */
export function estante(c: Ctx, x: number, y: number) {
  r(c, x, y, 30, 26, TRACO);
  r(c, x + 1, y + 1, 28, 24, "#8d6a3f");
  for (let f = 0; f < 3; f++) {
    r(c, x + 2, y + 3 + f * 8, 26, 6, "#7a5a34");
    for (let i = 0; i < 5; i++) {
      r(c, x + 3 + i * 5, y + 4 + f * 8, 4, 4,
        ["#c4463a", "#3f6fc4", "#2f9e69", "#c9a227", "#7a4fc0"][(i + f) % 5]);
    }
  }
}
