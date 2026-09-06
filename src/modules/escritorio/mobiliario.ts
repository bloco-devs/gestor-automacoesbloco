/**
 * Biblioteca de móveis e arquitetura do Escritório, em pixel art.
 *
 * Cada peça é desenhada UMA vez num canvas próprio e depois só copiada no
 * mapa — nenhum móvel é redesenhado a cada quadro.
 *
 * Regras que valem para TODAS as peças:
 *  - dimensão múltipla de 16 (a grade);
 *  - contorno de 1 px, sempre a mesma espessura;
 *  - luz do canto superior esquerdo → topo claro, base escura;
 *  - sombra projetada para baixo/direita, dentro do próprio sprite;
 *  - nenhum arredondamento, nenhum degradê, nenhum blur.
 *
 * A escala de tudo aqui sai do BLINK de produção (22×46 px). Ele é a régua:
 * o ambiente foi dimensionado em volta dele, nunca o contrário.
 *
 * Os canvas são criados SOB DEMANDA. O layout importa este módulo só para
 * saber os tamanhos, e o teste roda em jsdom sem canvas — construir sprite no
 * carregamento do módulo derrubaria a suíte inteira.
 */

import { TILE } from "./sprites";

export const P = {
  OUTLINE: "#14201a",

  WALL: "#efe9dc",
  WALL_LIGHT: "#f8f4ea",
  WALL_DARK: "#cbc3b1",

  FLOOR: "#9fb3a8",
  FLOOR_DARK: "#8ba095",
  FLOOR_LINE: "#879b91",

  WOOD: "#b5804a",
  WOOD_LIGHT: "#cf9a60",
  WOOD_DARK: "#8a5c31",

  METAL: "#7b8494",
  METAL_LIGHT: "#98a1b0",
  METAL_DARK: "#575e6b",

  GLASS: "#a8cbdd",
  GLASS_LIGHT: "#cfe6f2",

  PLANT: "#4f9a52",
  PLANT_LIGHT: "#6fb96a",
  PLANT_DARK: "#3a7540",

  TERRA: "#b0653c",
  TERRA_DARK: "#8c4c2b",

  PAPER: "#efe9dc",
  PAPER_DARK: "#cbc3b1",

  SCREEN_OFF: "#3a4450",
  SCREEN_ON: "#3fbfa8",
  SCREEN_WARN: "#c4463a",

  SHADOW: "rgba(20,32,26,.20)",
  SHADOW_SOFT: "rgba(20,32,26,.12)",
} as const;

type Pincel = (x: number, y: number, w: number, h: number, cor: string) => void;

/** Contorno de 1 px em volta de um retângulo, sempre igual. */
const borda = (r: Pincel, x: number, y: number, w: number, h: number) => {
  r(x, y, w, 1, P.OUTLINE);
  r(x, y + h - 1, w, 1, P.OUTLINE);
  r(x, y, 1, h, P.OUTLINE);
  r(x + w - 1, y, 1, h, P.OUTLINE);
};

/** Sombra padrão: 1 px deslocada para baixo/direita. */
const sombra = (r: Pincel, x: number, y: number, w: number, h: number) =>
  r(x + 1, y + h, w, 1, P.SHADOW);

interface Peca {
  w: number;
  h: number;
  desenhar: (r: Pincel) => void;
}

const parede = (r: Pincel, w: number, h: number) => {
  r(0, 0, w, h, P.WALL);
  r(0, 0, w, 2, P.WALL_LIGHT);
  r(0, h - 2, w, 2, P.WALL_DARK);
  borda(r, 0, 0, w, h);
};

const piso = (r: Pincel, base: string, linha: string) => {
  r(0, 0, TILE, TILE, base);
  r(0, 0, TILE, 1, linha);
  r(0, 0, 1, TILE, linha);
};

const mesa = (largura: number): Peca => ({
  w: largura,
  h: TILE * 2,
  desenhar: (r) => {
    const w = largura;
    sombra(r, 2, 4, w - 2, 20);
    r(1, 3, w - 2, 18, P.WOOD); // tampo visto de cima
    r(2, 4, w - 4, 2, P.WOOD_LIGHT); // luz no canto superior esquerdo
    r(1, 3, 2, 18, P.WOOD_LIGHT);
    r(1, 19, w - 2, 3, P.WOOD_DARK); // borda da frente
    r(w - 3, 3, 2, 19, P.WOOD_DARK);
    for (let x = 4; x < w - 4; x += 6) r(x, 8, 2, 1, P.WOOD_DARK); // veio
    borda(r, 0, 2, w, 20);
  },
});

const computador = (fundo: string, linhas?: string, brilho?: string): Peca => ({
  w: TILE * 2,
  h: TILE * 2,
  desenhar: (r) => {
    sombra(r, 4, 3, 24, 22);
    r(4, 2, 24, 18, P.OUTLINE); // monitor
    r(5, 3, 22, 16, P.METAL_DARK);
    r(6, 4, 20, 3, P.METAL);
    r(7, 6, 18, 11, fundo);
    if (linhas) {
      r(9, 8, 14, 2, linhas);
      r(9, 11, 10, 2, linhas);
      r(9, 14, 12, 1, linhas);
    }
    if (brilho) {
      r(9, 8, 4, 2, brilho);
      r(9, 6, 2, 1, brilho);
    }
    r(14, 20, 4, 2, P.METAL_DARK); // pescoço
    r(10, 22, 12, 2, P.METAL);
    borda(r, 9, 21, 14, 4);
    r(3, 26, 20, 4, P.METAL_DARK); // teclado
    r(4, 27, 18, 2, P.PAPER_DARK);
    borda(r, 2, 25, 22, 6);
    r(25, 26, 5, 4, P.METAL); // mouse
    borda(r, 24, 25, 7, 6);
  },
});

const planta = (w: number, h: number, escala: 1 | 2 | 3): Peca => ({
  w,
  h,
  desenhar: (r) => {
    if (escala === 1) {
      sombra(r, 3, 12, 10, 16);
      r(4, 20, 9, 8, P.TERRA);
      r(4, 20, 9, 2, "#c9784f");
      r(4, 26, 9, 2, P.TERRA_DARK);
      borda(r, 3, 19, 11, 10);
      r(7, 12, 3, 8, P.PLANT_DARK);
      r(4, 13, 5, 5, P.PLANT);
      r(8, 11, 5, 5, P.PLANT_LIGHT);
      r(7, 8, 3, 4, P.PLANT_LIGHT);
      return;
    }
    if (escala === 2) {
      sombra(r, 5, 16, 22, 30);
      r(7, 32, 18, 13, P.TERRA);
      r(7, 32, 18, 3, "#c9784f");
      r(7, 42, 18, 3, P.TERRA_DARK);
      borda(r, 6, 31, 20, 15);
      r(14, 14, 4, 18, P.PLANT_DARK);
      r(4, 16, 10, 8, P.PLANT);
      r(18, 13, 10, 8, P.PLANT_LIGHT);
      r(6, 23, 9, 7, P.PLANT_LIGHT);
      r(17, 21, 9, 7, P.PLANT);
      r(13, 6, 5, 9, P.PLANT_LIGHT);
      r(10, 8, 5, 5, P.PLANT);
      return;
    }
    sombra(r, 8, 18, 32, 28);
    r(12, 30, 24, 15, P.TERRA);
    r(12, 30, 24, 3, "#c9784f");
    r(12, 41, 24, 4, P.TERRA_DARK);
    borda(r, 11, 29, 26, 17);
    r(22, 12, 5, 18, P.PLANT_DARK);
    r(6, 14, 14, 10, P.PLANT);
    r(26, 10, 15, 10, P.PLANT_LIGHT);
    r(9, 22, 13, 9, P.PLANT_LIGHT);
    r(24, 19, 13, 9, P.PLANT);
    r(20, 3, 8, 10, P.PLANT_LIGHT);
    r(15, 6, 7, 6, P.PLANT);
  },
});

/**
 * Catálogo. A chave é o id que o layout guarda; nada aqui é criado antes de
 * alguém pedir o canvas.
 */
const PECAS = {
  piso_base: { w: TILE, h: TILE, desenhar: (r) => piso(r, P.FLOOR, P.FLOOR_LINE) },
  piso_var1: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      piso(r, P.FLOOR_DARK, P.FLOOR_LINE);
      r(12, 12, 2, 2, P.FLOOR);
    },
  },
  piso_var2: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      piso(r, P.FLOOR, P.FLOOR_LINE);
      r(7, 7, 2, 2, P.FLOOR_LINE);
      r(6, 8, 1, 1, P.FLOOR_DARK);
      r(9, 7, 1, 1, P.FLOOR_DARK);
    },
  },
  piso_corredor: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      piso(r, "#c9c2b2", "#b6ae9c");
      r(13, 13, 2, 2, "#d6cfc0");
    },
  },

  /* Passadeira do corredor, em três peças: uma peça única com motivo dentro
   * virava tijolo repetido. Com topo, meio e base a faixa fecha com borda e
   * lê como UMA passadeira contínua. */
  trilha: { w: TILE, h: TILE, desenhar: (r) => r(0, 0, TILE, TILE, "#bdb199") },
  trilha_topo: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE, TILE, "#bdb199");
      r(0, 0, TILE, 1, "#9b8f77");
      r(0, 1, TILE, 1, "#cbbfa7");
    },
  },
  trilha_base: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE, TILE, "#bdb199");
      r(0, TILE - 1, TILE, 1, "#9b8f77");
      r(0, TILE - 2, TILE, 1, "#aa9e86");
    },
  },

  parede_h: { w: TILE, h: TILE, desenhar: (r) => parede(r, TILE, TILE) },
  parede_v: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE, TILE, P.WALL);
      r(0, 0, 2, TILE, P.WALL_LIGHT);
      r(TILE - 2, 0, 2, TILE, P.WALL_DARK);
      borda(r, 0, 0, TILE, TILE);
    },
  },
  parede_canto: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE, TILE, P.WALL);
      r(0, 0, TILE, 2, P.WALL_LIGHT);
      r(0, 0, 2, TILE, P.WALL_LIGHT);
      borda(r, 0, 0, TILE, TILE);
    },
  },

  porta_aberta: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE * 3, TILE, P.WALL);
      r(0, 0, TILE * 3, 2, P.WALL_LIGHT);
      borda(r, 0, 0, TILE * 3, TILE);
      r(3, 2, 42, TILE - 4, P.OUTLINE);
      r(4, 3, 40, TILE - 6, "#3b4a44"); // vão escuro
      r(4, 3, 7, TILE - 6, P.WOOD); // folhas encostadas
      r(37, 3, 7, TILE - 6, P.WOOD);
    },
  },
  porta_fechada: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE * 3, TILE, P.WALL);
      r(0, 0, TILE * 3, 2, P.WALL_LIGHT);
      borda(r, 0, 0, TILE * 3, TILE);
      r(3, 2, 42, TILE - 4, P.WOOD_DARK); // batente
      r(4, 3, 40, TILE - 6, P.WOOD);
      r(23, 3, 2, TILE - 6, P.WOOD_DARK); // folha dupla
      r(4, 3, 40, 1, P.WOOD_LIGHT);
      r(19, 8, 3, 2, P.METAL_LIGHT);
      r(26, 8, 3, 2, P.METAL_LIGHT);
    },
  },
  /** Serviço cadastrado de que não sai integração nenhuma: madeira sem vida. */
  porta_apagada: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE * 3, TILE, P.WALL);
      r(0, 0, TILE * 3, 2, P.WALL_LIGHT);
      borda(r, 0, 0, TILE * 3, TILE);
      r(3, 2, 42, TILE - 4, "#4a443c");
      r(4, 3, 40, TILE - 6, "#6b6357");
      r(23, 3, 2, TILE - 6, "#4a443c");
      r(4, 3, 40, 1, "#7d7466");
      r(19, 8, 3, 2, "#8a8172");
      r(26, 8, 3, 2, "#8a8172");
    },
  },

  janela_dupla: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE * 3, TILE, P.WALL);
      r(0, 0, TILE * 3, 2, P.WALL_LIGHT);
      borda(r, 0, 0, TILE * 3, TILE);
      r(3, 3, 42, 10, P.OUTLINE); // moldura encaixada NA parede
      r(4, 4, 40, 8, P.WOOD_DARK);
      r(5, 5, 38, 6, P.GLASS);
      r(5, 5, 38, 2, P.GLASS_LIGHT); // reflexo, luz de cima-esquerda
      r(17, 4, 2, 8, P.WOOD_DARK);
      r(29, 4, 2, 8, P.WOOD_DARK);
      r(7, 6, 6, 1, "#ffffff");
      r(4, 12, 40, 1, P.WOOD_LIGHT); // peitoril
    },
  },
  janela_simples: {
    w: TILE * 2,
    h: TILE,
    desenhar: (r) => {
      r(0, 0, TILE * 2, TILE, P.WALL);
      r(0, 0, TILE * 2, 2, P.WALL_LIGHT);
      borda(r, 0, 0, TILE * 2, TILE);
      r(4, 3, 24, 10, P.OUTLINE);
      r(5, 4, 22, 8, P.WOOD_DARK);
      r(6, 5, 20, 6, P.GLASS);
      r(6, 5, 20, 2, P.GLASS_LIGHT);
      r(15, 4, 2, 8, P.WOOD_DARK);
      r(5, 12, 22, 1, P.WOOD_LIGHT);
    },
  },

  mesa_pequena: mesa(TILE * 3),
  mesa_grande: mesa(TILE * 4),

  cadeira: {
    w: TILE * 2,
    h: TILE * 2,
    desenhar: (r) => {
      sombra(r, 4, 6, 24, 22);
      r(6, 2, 20, 8, P.METAL_DARK); // encosto alto
      r(8, 4, 16, 4, P.METAL);
      r(2, 12, 4, 8, P.METAL_DARK); // braços
      r(26, 12, 4, 8, P.METAL_DARK);
      r(6, 10, 20, 14, "#3d4756"); // assento estofado
      r(8, 12, 16, 6, "#4d596b");
      borda(r, 5, 1, 22, 24);
      r(14, 25, 4, 2, P.METAL_DARK); // coluna
      r(8, 27, 16, 2, P.METAL_DARK); // base em cruz
      r(15, 27, 2, 3, P.METAL_DARK);
      r(6, 29, 4, 1, P.OUTLINE);
      r(22, 29, 4, 1, P.OUTLINE);
    },
  },

  arquivo: {
    w: TILE * 2,
    h: TILE * 3,
    desenhar: (r) => {
      sombra(r, 2, 4, 28, 42);
      r(2, 4, 28, 42, P.METAL);
      r(2, 4, 28, 3, P.METAL_LIGHT);
      r(2, 43, 28, 3, P.METAL_DARK);
      r(2, 4, 3, 42, P.METAL_LIGHT);
      r(27, 4, 3, 42, P.METAL_DARK);
      borda(r, 1, 3, 30, 44);
      for (let i = 0; i < 3; i++) {
        r(6, 10 + i * 12, 20, 9, P.METAL_DARK);
        r(6, 10 + i * 12, 20, 2, P.METAL_LIGHT);
        borda(r, 5, 9 + i * 12, 22, 11);
        r(13, 14 + i * 12, 6, 2, P.PAPER_DARK);
      }
    },
  },
  estante: {
    w: TILE * 3,
    h: TILE * 3,
    desenhar: (r) => {
      sombra(r, 2, 4, 44, 42);
      r(2, 4, 44, 42, P.WOOD_DARK);
      r(2, 4, 44, 3, P.WOOD_LIGHT);
      r(2, 4, 3, 42, P.WOOD_LIGHT);
      borda(r, 1, 3, 46, 44);
      const livros = [P.SCREEN_WARN, "#3f6fc4", P.PLANT, "#c98a2f", "#7a4fc0", "#2f8ba8"];
      for (let f = 0; f < 3; f++) {
        const y = 9 + f * 12;
        r(5, y, 38, 9, "#2b2118"); // vão da prateleira
        let x = 6;
        while (x < 41) {
          const w = 2 + ((x + f) % 3);
          r(x, y + 1, w, 8, livros[(x + f) % livros.length]);
          r(x, y + 1, w, 1, P.PAPER);
          x += w + 1;
        }
        r(4, y + 9, 40, 2, P.WOOD); // travessa
        r(4, y + 9, 40, 1, P.WOOD_LIGHT);
      }
    },
  },

  computador_idle: computador(P.SCREEN_OFF, "#4a5560"),
  computador_ativo: computador(P.SCREEN_ON, "#2f9e8f", P.GLASS_LIGHT),
  computador_falha: computador(P.SCREEN_WARN, "#a33326"),
  computador_apagado: computador("#1c1f24"),

  impressora: {
    w: TILE * 2,
    h: TILE * 2,
    desenhar: (r) => {
      sombra(r, 3, 8, 26, 20);
      r(4, 9, 24, 18, P.METAL);
      r(4, 9, 24, 3, P.METAL_LIGHT);
      r(4, 24, 24, 3, P.METAL_DARK);
      borda(r, 3, 8, 26, 20);
      r(8, 3, 16, 7, P.PAPER);
      r(9, 4, 14, 2, "#ffffff");
      borda(r, 7, 2, 18, 9);
      r(7, 17, 18, 5, P.METAL_DARK); // bandeja de saída
      r(8, 18, 16, 2, P.PAPER_DARK);
      r(23, 13, 3, 2, P.PLANT_LIGHT); // led
    },
  },
  telefone: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      sombra(r, 3, 6, 10, 7);
      r(4, 7, 9, 6, P.METAL_DARK);
      borda(r, 3, 6, 11, 8);
      r(5, 8, 7, 2, P.METAL_LIGHT);
      r(4, 5, 3, 3, P.OUTLINE);
      r(5, 6, 1, 1, P.METAL);
    },
  },

  planta_pequena: planta(TILE, TILE * 2, 1),
  planta_media: planta(TILE * 2, TILE * 3, 2),
  planta_canto: planta(TILE * 3, TILE * 3, 3),

  quadro_branco: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      sombra(r, 2, 3, 44, 10);
      r(2, 2, 44, 11, P.OUTLINE);
      r(3, 3, 42, 9, "#f4f2ea");
      r(3, 3, 42, 2, "#ffffff");
      r(7, 6, 18, 1, "#3f6fc4");
      r(7, 8, 26, 1, P.SCREEN_WARN);
      r(7, 10, 14, 1, P.PLANT);
      r(28, 6, 10, 1, P.PLANT_DARK);
      r(4, 13, 42, 2, P.METAL); // calha de canetas
    },
  },
  lixeira: {
    w: TILE,
    h: TILE,
    desenhar: (r) => {
      sombra(r, 4, 5, 8, 9);
      r(4, 4, 8, 10, P.METAL);
      r(4, 4, 8, 2, P.METAL_LIGHT);
      r(4, 12, 8, 2, P.METAL_DARK);
      borda(r, 3, 3, 10, 12);
      r(6, 6, 1, 6, P.METAL_DARK);
      r(9, 6, 1, 6, P.METAL_DARK);
    },
  },
  bebedouro: {
    w: TILE,
    h: TILE * 3,
    desenhar: (r) => {
      sombra(r, 2, 12, 12, 34);
      r(3, 4, 10, 14, P.GLASS_LIGHT); // garrafão
      r(4, 5, 8, 12, P.GLASS);
      r(4, 5, 3, 12, "#ffffff");
      borda(r, 2, 3, 12, 16);
      r(3, 18, 10, 28, P.PAPER); // gabinete
      r(3, 18, 3, 28, "#ffffff");
      r(3, 43, 10, 3, P.PAPER_DARK);
      borda(r, 2, 17, 12, 30);
      r(5, 24, 6, 4, P.METAL_DARK); // torneiras
      r(5, 31, 6, 2, P.METAL);
    },
  },
  banco: {
    w: TILE * 2,
    h: TILE,
    desenhar: (r) => {
      sombra(r, 2, 5, 28, 8);
      r(1, 4, 30, 7, P.WOOD);
      r(2, 5, 28, 2, P.WOOD_LIGHT);
      r(1, 9, 30, 2, P.WOOD_DARK);
      borda(r, 0, 3, 32, 9);
      r(4, 12, 2, 2, P.METAL_DARK);
      r(26, 12, 2, 2, P.METAL_DARK);
    },
  },
  sofa: {
    w: TILE * 3,
    h: TILE * 2,
    desenhar: (r) => {
      sombra(r, 3, 8, 43, 21);
      // encosto: barra grossa no topo, é o que diz "sofá" antes de tudo
      r(2, 2, 44, 9, "#3f6b63");
      r(4, 3, 40, 3, "#5c8a80");
      borda(r, 1, 1, 46, 11);
      r(2, 11, 7, 16, "#35594f"); // braços
      r(3, 12, 4, 13, "#4a7a70");
      borda(r, 1, 10, 9, 18);
      r(39, 11, 7, 16, "#35594f");
      r(40, 12, 4, 13, "#4a7a70");
      borda(r, 38, 10, 9, 18);
      r(11, 12, 12, 14, "#6d9e92"); // almofadas
      r(12, 13, 10, 5, "#82b3a6");
      borda(r, 10, 11, 14, 16);
      r(25, 12, 12, 14, "#6d9e92");
      r(26, 13, 10, 5, "#82b3a6");
      borda(r, 24, 11, 14, 16);
      r(4, 28, 4, 2, P.OUTLINE);
      r(40, 28, 4, 2, P.OUTLINE);
    },
  },
  mesa_cafe: {
    w: TILE * 2,
    h: TILE,
    desenhar: (r) => {
      sombra(r, 2, 4, 28, 9);
      r(1, 3, 30, 9, P.METAL);
      r(2, 4, 28, 2, P.METAL_LIGHT);
      r(1, 10, 30, 2, P.METAL_DARK);
      borda(r, 0, 2, 32, 11);
      r(6, 5, 5, 4, P.PAPER);
      r(6, 5, 5, 1, "#ffffff");
      r(20, 5, 4, 4, P.SCREEN_WARN);
    },
  },
  balcao: {
    w: TILE * 4,
    h: TILE * 2,
    desenhar: (r) => {
      sombra(r, 3, 10, 59, 18);
      r(2, 6, 60, 16, P.PAPER);
      r(3, 7, 58, 3, "#ffffff");
      r(2, 20, 60, 3, P.PAPER_DARK);
      borda(r, 1, 5, 62, 18);
      r(1, 2, 62, 6, P.WOOD); // tampo avançado
      r(2, 3, 60, 2, P.WOOD_LIGHT);
      r(1, 7, 62, 2, P.WOOD_DARK);
      borda(r, 0, 1, 64, 9);
      r(10, 12, 8, 5, P.METAL_DARK);
      r(11, 13, 6, 2, P.SCREEN_ON); // terminal
      r(46, 12, 6, 5, P.PAPER_DARK);
    },
  },
  /** Regra: o tapete é SEMPRE mais claro que o piso. Escuro vira buraco. */
  tapete: {
    w: TILE * 3,
    h: TILE * 2,
    desenhar: (r) => {
      r(2, 5, 45, 24, P.SHADOW_SOFT);
      r(1, 3, 45, 25, "#b8563f"); // debrum terracota
      r(3, 5, 41, 21, "#e0d3b4"); // campo claro
      r(5, 7, 37, 17, "#d6c49f");
      r(8, 10, 31, 11, "#e0d3b4");
      r(11, 12, 25, 7, "#c9a97a"); // medalhão central
      r(14, 14, 19, 3, "#e8dcc0");
      for (let x = 3; x < 44; x += 5) {
        r(x, 1, 3, 2, "#e8dcc0"); // franja
        r(x, 28, 3, 2, "#e8dcc0");
      }
      borda(r, 0, 2, 47, 27);
    },
  },
  /** Capacho: dá função à soleira de cada porta de serviço. */
  capacho: {
    w: TILE * 3,
    h: TILE,
    desenhar: (r) => {
      r(3, 5, 43, 9, P.SHADOW_SOFT);
      r(2, 3, 44, 10, "#5c5346");
      r(4, 5, 40, 6, "#7a6f5d");
      for (let x = 7; x < 42; x += 4) r(x, 6, 2, 4, "#5c5346");
      borda(r, 1, 2, 46, 12);
    },
  },
} satisfies Record<string, Peca>;

export type PecaId = keyof typeof PECAS;

/** Quadro de parede colorido; a cor entra no id para o cache não misturar. */
const CORES_QUADRO = ["#c4463a", "#3f6fc4", "#2f9e69", "#c98a2f"] as const;
export type QuadroId = `quadro_${0 | 1 | 2 | 3}`;
export type SpriteId = PecaId | QuadroId | `relogio_${number}`;

const quadro = (cor: string): Peca => ({
  w: TILE,
  h: TILE,
  desenhar: (r) => {
    sombra(r, 2, 3, 12, 9);
    r(2, 3, 12, 9, P.WOOD_DARK);
    borda(r, 1, 2, 14, 11);
    r(4, 5, 8, 5, P.PAPER);
    r(5, 7, 6, 2, cor);
    r(5, 6, 3, 1, cor);
  },
});

/** Relógio de parede: moldura, mostrador e dois ponteiros. */
const relogio = (minutoDoDia: number): Peca => ({
  w: TILE,
  h: TILE,
  desenhar: (r) => {
    sombra(r, 3, 3, 10, 10);
    for (let dy = -5; dy <= 5; dy++) {
      const dx = Math.floor(Math.sqrt(25 - dy * dy));
      r(8 - dx, 8 + dy, 2 * dx + 1, 1, P.OUTLINE);
    }
    for (let dy = -4; dy <= 4; dy++) {
      const dx = Math.floor(Math.sqrt(16 - dy * dy));
      r(8 - dx, 8 + dy, 2 * dx + 1, 1, P.PAPER);
    }
    r(8, 4, 1, 1, P.OUTLINE);
    r(8, 12, 1, 1, P.OUTLINE);
    r(4, 8, 1, 1, P.OUTLINE);
    r(12, 8, 1, 1, P.OUTLINE);
    const hora = Math.floor(minutoDoDia / 60) % 12;
    const minuto = minutoDoDia % 60;
    const ah = (hora / 12) * Math.PI * 2 - Math.PI / 2;
    const am = (minuto / 60) * Math.PI * 2 - Math.PI / 2;
    for (let t = 0; t <= 2; t++) {
      r(8 + Math.round(Math.cos(ah) * t), 8 + Math.round(Math.sin(ah) * t), 1, 1, P.OUTLINE);
    }
    for (let t = 0; t <= 3; t++) {
      r(8 + Math.round(Math.cos(am) * t), 8 + Math.round(Math.sin(am) * t), 1, 1, P.SCREEN_WARN);
    }
    r(8, 8, 1, 1, P.OUTLINE);
  },
});

function receita(id: SpriteId): Peca {
  if (id.startsWith("quadro_")) return quadro(CORES_QUADRO[Number(id.slice(7)) % 4]);
  if (id.startsWith("relogio_")) return relogio(Number(id.slice(8)));
  return PECAS[id as PecaId];
}

/** Tamanho de uma peça, sem precisar de canvas — é o que o layout consulta. */
export function tamanhoDaPeca(id: SpriteId): { w: number; h: number } {
  const p = receita(id);
  return { w: p.w, h: p.h };
}

const cache = new Map<SpriteId, HTMLCanvasElement | null>();

/**
 * Canvas da peça, criado na primeira vez que alguém pede.
 *
 * Devolve `null` onde não há canvas de verdade (jsdom nos testes). Quem
 * desenha simplesmente pula — é melhor que derrubar a suíte inteira.
 */
export function obterSprite(id: SpriteId): HTMLCanvasElement | null {
  const guardado = cache.get(id);
  if (guardado !== undefined) return guardado;

  const p = receita(id);
  let canvas: HTMLCanvasElement | null = null;
  if (typeof document !== "undefined") {
    const el = document.createElement("canvas");
    el.width = p.w;
    el.height = p.h;
    const ctx = el.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      p.desenhar((x, y, w, h, cor) => {
        ctx.fillStyle = cor;
        ctx.fillRect(x, y, w, h);
      });
      canvas = el;
    }
  }
  cache.set(id, canvas);
  return canvas;
}
