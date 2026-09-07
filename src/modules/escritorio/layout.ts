/**
 * Planta baixa do andar: uma sala por grupo, uma mesa por sistema.
 *
 * O andar é um TILEMAP de 16 px. A mesma grade serve para desenhar e para
 * andar: o que ocupa célula aqui é exatamente o que bloqueia o personagem —
 * não existem duas verdades.
 *
 * Toda medida sai do BLINK de produção (22×46 px). Ele é a régua: o posto de
 * trabalho tem 5 linhas porque é o que um boneco de 46 px em pé precisa
 * (2 de mesa + 3 de corpo), e nenhum corredor tem menos de 3 tiles.
 *
 * Este módulo NÃO desenha. Ele só diz qual peça vai em qual pixel; quem
 * rasteriza é o canvas. É o que deixa a planta testável sem canvas nenhum.
 */

import { PERSONAGEM_H, PERSONAGEM_W, TILE } from "./sprites";
import { tamanhoDaPeca, type SpriteId } from "./mobiliario";
import type { ConectorEco, SistemaEco } from "./dados";

/** Margem externa do andar, em pixels. Mantida para a câmera e os testes. */
export const MARGEM = TILE;
/** Faixa de circulação entre duas fileiras de salas: 80 px, dois BLINKs. */
export const CORREDOR_Y = TILE * 5;

const POSTO_L = 5; // mesa 3 + cadeira 2
const POSTO_A = 5; // mesa 2 + 3 linhas: o BLINK de pé ocupa a primeira
const FOLGA = 1; // coluna livre à esquerda: o corredor interno da sala
const BANDA_MOVEL = 3; // faixa de armários/plantas no fundo
const VAO_PORTA = 1; // linha livre entre a faixa de móveis e a porta
const CORREDOR_LATERAL = 2;
const CORREDOR_TOPO = 2;
const CORREDOR_MEIO = 5;
const CORREDOR_RODAPE = 7; // área de serviço: portas, capachos, entrega
const VAO_ENTRE_SALAS = 3;

export const CELULA = {
  LIVRE: 0,
  PAREDE: 1,
  PORTA: 2,
  MOVEL: 3,
  BLOQUEADO: 4,
} as const;
export type Celula = (typeof CELULA)[keyof typeof CELULA];

/** Ordem em que as salas aparecem; grupo desconhecido entra no fim. */
const ORDEM_GRUPOS = [
  "Pessoas",
  "Operação",
  "Comercial",
  "Financeiro",
  "Suprimentos",
  "Incorporação",
  "Engenharia",
  "Jurídico",
  "Tecnologia",
  "Identidade",
  "Plataforma",
  "Processos",
  "Empreendimentos",
  "Viabilidade",
  "Obra",
  "Projetos",
  "Contratos",
];

export interface Mesa {
  sistemaId: string;
  nome: string;
  grupo: string;
  /** Canto superior esquerdo do tampo. */
  x: number;
  y: number;
  pessoaX: number;
  pessoaY: number;
  cadeiraX: number;
  cadeiraY: number;
  /** Ponto no chão onde o personagem para ao sair ou ao visitar. */
  saidaX: number;
  saidaY: number;
  salaIdx: number;
  /** Célula da grade onde o BLINK fica de pé. */
  tileX: number;
  tileY: number;
  /** Onde o monitor é desenhado — o estado dele muda a cada quadro. */
  monitorX: number;
  monitorY: number;
}

export interface Sala {
  grupo: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Centro do vão da porta, na parede de baixo. */
  portaX: number;
  /** Y do corredor horizontal que serve esta sala. */
  corredorY: number;
  linha: number;
}

export interface PortaExterna {
  conectorId: string;
  nome: string;
  x: number;
  y: number;
  /** Ponto no corredor em frente à porta. */
  frenteX: number;
  frenteY: number;
  tileX: number;
  tileY: number;
}

export interface ItemDesenho {
  sprite: SpriteId;
  x: number;
  y: number;
}

export interface Andar {
  largura: number;
  altura: number;
  colunas: number;
  linhasGrade: number;
  grade: Uint8Array;
  /** Já na ordem de desenho: piso, paredes, arquitetura, mobília, props. */
  camadas: ItemDesenho[];
  salas: Sala[];
  mesas: Mesa[];
  portas: PortaExterna[];
  hallX: number;
  corredores: number[];
  mesaPorSistema: Map<string, Mesa>;
  portaPorConector: Map<string, PortaExterna>;
}

export interface Ponto {
  x: number;
  y: number;
}

/* ----------------------------------------------------------- grade --- */

export function celulaEm(andar: Andar, tx: number, ty: number): Celula {
  if (tx < 0 || ty < 0 || tx >= andar.colunas || ty >= andar.linhasGrade) return CELULA.BLOQUEADO;
  return andar.grade[ty * andar.colunas + tx] as Celula;
}

export function andavel(andar: Andar, tx: number, ty: number): boolean {
  const c = celulaEm(andar, tx, ty);
  return c === CELULA.LIVRE || c === CELULA.PORTA;
}

/**
 * Canto superior esquerdo do sprite quando o BLINK ocupa uma célula.
 *
 * Os pés encostam na base da célula; sem esse desconto o personagem anda com
 * a cabeça na linha do corredor e o corpo atravessando a parede de baixo.
 */
export function pontoDoTile(tx: number, ty: number): Ponto {
  return { x: tx * TILE, y: ty * TILE + TILE - PERSONAGEM_H };
}

/* ------------------------------------------------------- construção --- */

interface Obra {
  colunas: number;
  linhas: number;
  grade: Uint8Array;
  camadas: ItemDesenho[];
}

function novaObra(colunas: number, linhas: number): Obra {
  return {
    colunas,
    linhas,
    grade: new Uint8Array(colunas * linhas).fill(CELULA.BLOQUEADO),
    camadas: [],
  };
}

const marcar = (o: Obra, tx: number, ty: number, tipo: Celula) => {
  if (tx >= 0 && ty >= 0 && tx < o.colunas && ty < o.linhas) o.grade[ty * o.colunas + tx] = tipo;
};
const ler = (o: Obra, tx: number, ty: number): Celula =>
  tx < 0 || ty < 0 || tx >= o.colunas || ty >= o.linhas
    ? CELULA.BLOQUEADO
    : (o.grade[ty * o.colunas + tx] as Celula);

const por = (o: Obra, sprite: SpriteId, tx: number, ty: number, ox = 0, oy = 0) =>
  o.camadas.push({ sprite, x: tx * TILE + ox, y: ty * TILE + oy });

/**
 * Objeto com base no chão: o sprite pode ser mais alto que a pegada, mas a
 * base encosta na última linha ocupada. É o que faz um armário de 48 px
 * parecer apoiado no piso e não flutuando.
 */
function bloco(o: Obra, sprite: SpriteId, tx: number, ty: number, largura: number, altura: number) {
  const { h } = tamanhoDaPeca(sprite);
  o.camadas.push({ sprite, x: tx * TILE, y: (ty + altura) * TILE - h });
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) marcar(o, tx + x, ty + y, CELULA.MOVEL);
  }
}

/**
 * Igual a `bloco`, mas recusa a posição se ela ocupar célula que não seja
 * piso livre ou se encostar em qualquer porta.
 *
 * É o que impede a decoração de corredor de tapar uma soleira — sem isso a
 * sala fica inalcançável, e o erro só aparece quando alguém tenta andar até
 * lá.
 */
function blocoSeLivre(
  o: Obra,
  sprite: SpriteId,
  tx: number,
  ty: number,
  largura: number,
  altura: number,
): boolean {
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (ler(o, tx + x, ty + y) !== CELULA.LIVRE) return false;
      const vizinhos: [number, number][] = [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ];
      for (const [dx, dy] of vizinhos) {
        if (ler(o, tx + x + dx, ty + y + dy) === CELULA.PORTA) return false;
      }
    }
  }
  bloco(o, sprite, tx, ty, largura, altura);
  return true;
}

function pisoEm(o: Obra, x0: number, y0: number, w: number, h: number, corredor = false) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const sprite: SpriteId = corredor
        ? "piso_corredor"
        : (x * 7 + y * 3) % 13 === 0
          ? "piso_var2"
          : (x + y) % 5 === 0
            ? "piso_var1"
            : "piso_base";
      por(o, sprite, x, y);
      marcar(o, x, y, CELULA.LIVRE);
    }
  }
}

/**
 * Quantas colunas de posto uma sala precisa.
 *
 * Até quatro sistemas os postos ficam LADO A LADO, numa fileira só. Empilhar
 * em 2×2 obrigava a linha inteira de salas a crescer junto com a maior, e as
 * salas de um sistema só ficavam com metade do chão vazia.
 */
export function gradeDePostos(qtd: number): { colunas: number; fileiras: number } {
  const colunas = Math.min(Math.max(qtd, 1), 4);
  return { colunas, fileiras: Math.ceil(qtd / colunas) };
}

export function tamanhoDaSala(qtd: number): { w: number; h: number; colunas: number; fileiras: number } {
  const g = gradeDePostos(qtd);
  return {
    w: g.colunas * POSTO_L + (g.colunas + 1) * FOLGA + 2,
    h: g.fileiras * POSTO_A + BANDA_MOVEL + VAO_PORTA + 2,
    ...g,
  };
}

/** Divide N salas em `linhas` grupos do tamanho mais parecido possível. */
function reparte<T>(itens: T[], linhas: number): T[][] {
  const base = Math.floor(itens.length / linhas);
  const sobra = itens.length % linhas;
  const out: T[][] = [];
  let i = 0;
  for (let l = 0; l < linhas; l++) {
    const n = base + (l < sobra ? 1 : 0);
    out.push(itens.slice(i, i + n));
    i += n;
  }
  return out;
}

/**
 * Quantas fileiras de sala o andar tem.
 *
 * Não é fixo: com fileiras de tamanho desigual sobra um terço do andar vazio,
 * como acontecia com 5+5+2. Aqui as fileiras são sempre equilibradas e ganha
 * a divisão cuja proporção final fica mais perto de um andar largo e baixo.
 */
export function melhorDivisao(dims: { w: number; h: number }[]): number {
  let melhor = 1;
  let menor = Infinity;
  for (let n = 1; n <= Math.min(4, dims.length); n++) {
    const grupos = reparte(dims, n);
    const larg = Math.max(
      ...grupos.map((g) => g.reduce((s, x) => s + x.w, 0) + (g.length - 1) * VAO_ENTRE_SALAS),
    );
    const alt = grupos.reduce((s, g) => s + Math.max(...g.map((x) => x.h)), 0) + CORREDOR_MEIO * (n - 1);
    const erro = Math.abs((larg + 6) / (alt + 8) - 1.9);
    if (erro < menor) {
      menor = erro;
      melhor = n;
    }
  }
  return melhor;
}

/* --------------------------------------------- composição por área --- */

type PecaSala =
  | "planta"
  | "plantaCanto"
  | "estante"
  | "arquivo"
  | "impressora"
  | "bebedouro"
  | "banco"
  | "lixeira"
  | "sofa"
  | "mesaCafe";

interface Receita {
  fundo: PecaSala[];
  sobra: PecaSala[];
  canto: "planta" | "bebedouro";
  parede: ("quadroBranco" | "relogio" | "quadro")[];
}

/**
 * A biblioteca de móveis é uma só; o que muda de sala para sala é a receita.
 * Quem trabalha com documento ganha arquivo e estante, quem atende ganha sofá
 * e mesa de centro, quem opera ganha densidade. Sem isso o andar vira N
 * caixas com o mesmo "mesa + planta + armário".
 */
const RECEITAS: Record<string, Receita> = {
  PESSOAS: { fundo: ["arquivo", "planta", "banco"], sobra: ["lixeira", "planta"], canto: "planta", parede: ["quadroBranco", "relogio", "quadro"] },
  OPERACAO: { fundo: ["estante", "arquivo", "impressora", "planta", "estante", "arquivo"], sobra: ["banco", "lixeira", "planta"], canto: "bebedouro", parede: ["quadroBranco", "quadro", "relogio", "quadroBranco"] },
  PROCESSOS: { fundo: ["estante", "arquivo", "impressora", "planta"], sobra: ["banco", "lixeira"], canto: "bebedouro", parede: ["quadroBranco", "relogio", "quadro"] },
  COMERCIAL: { fundo: ["sofa", "mesaCafe", "planta", "estante"], sobra: ["banco", "lixeira"], canto: "planta", parede: ["quadroBranco", "quadro", "relogio"] },
  FINANCEIRO: { fundo: ["arquivo", "arquivo", "impressora", "planta"], sobra: ["lixeira", "estante"], canto: "bebedouro", parede: ["relogio", "quadroBranco", "quadro"] },
  SUPRIMENTOS: { fundo: ["estante", "arquivo", "planta"], sobra: ["estante", "lixeira"], canto: "planta", parede: ["quadro", "relogio"] },
  JURIDICO: { fundo: ["arquivo", "estante", "arquivo", "planta"], sobra: ["lixeira", "banco"], canto: "planta", parede: ["quadro", "relogio", "quadro"] },
  CONTRATOS: { fundo: ["arquivo", "estante", "arquivo", "planta"], sobra: ["lixeira", "banco"], canto: "planta", parede: ["quadro", "relogio", "quadro"] },
  INCORPORACAO: { fundo: ["estante", "arquivo", "planta", "impressora"], sobra: ["lixeira", "estante"], canto: "bebedouro", parede: ["quadroBranco", "relogio", "quadro"] },
  EMPREENDIMENTOS: { fundo: ["estante", "arquivo", "planta", "impressora"], sobra: ["lixeira", "estante"], canto: "bebedouro", parede: ["quadroBranco", "relogio", "quadro"] },
  VIABILIDADE: { fundo: ["estante", "estante", "planta"], sobra: ["lixeira", "arquivo"], canto: "planta", parede: ["quadroBranco", "quadroBranco", "relogio"] },
  ENGENHARIA: { fundo: ["estante", "estante", "planta", "arquivo"], sobra: ["impressora", "lixeira"], canto: "planta", parede: ["quadroBranco", "quadroBranco", "relogio"] },
  PROJETOS: { fundo: ["estante", "estante", "planta", "arquivo"], sobra: ["impressora", "lixeira"], canto: "planta", parede: ["quadroBranco", "quadroBranco", "relogio"] },
  OBRA: { fundo: ["arquivo", "estante", "planta"], sobra: ["banco", "lixeira"], canto: "bebedouro", parede: ["quadroBranco", "relogio"] },
  TECNOLOGIA: { fundo: ["arquivo", "arquivo", "estante", "impressora"], sobra: ["bebedouro", "lixeira"], canto: "bebedouro", parede: ["relogio", "quadro", "quadroBranco"] },
  PLATAFORMA: { fundo: ["arquivo", "arquivo", "estante", "impressora"], sobra: ["bebedouro", "lixeira"], canto: "bebedouro", parede: ["relogio", "quadro", "quadroBranco"] },
  IDENTIDADE: { fundo: ["arquivo", "planta", "estante"], sobra: ["lixeira", "banco"], canto: "planta", parede: ["quadroBranco", "relogio", "quadro"] },
};

const RECEITA_PADRAO: Receita = {
  fundo: ["planta", "arquivo", "estante"],
  sobra: ["lixeira", "banco"],
  canto: "planta",
  parede: ["quadroBranco", "relogio"],
};

/** "Incorporação" e "INCORPORACAO" precisam cair na mesma receita. */
export function chaveDeGrupo(grupo: string): string {
  return grupo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

const receitaDe = (grupo: string): Receita => RECEITAS[chaveDeGrupo(grupo)] ?? RECEITA_PADRAO;

const PECA_SPRITE: Record<PecaSala, { sprite: SpriteId; w: number; h: number; dy: number }> = {
  planta: { sprite: "planta_media", w: 2, h: 3, dy: 0 },
  plantaCanto: { sprite: "planta_canto", w: 3, h: 3, dy: 0 },
  estante: { sprite: "estante", w: 3, h: 3, dy: 0 },
  arquivo: { sprite: "arquivo", w: 2, h: 3, dy: 0 },
  impressora: { sprite: "impressora", w: 2, h: 2, dy: 1 },
  bebedouro: { sprite: "bebedouro", w: 1, h: 3, dy: 0 },
  banco: { sprite: "banco", w: 2, h: 1, dy: 2 },
  lixeira: { sprite: "lixeira", w: 1, h: 1, dy: 2 },
  sofa: { sprite: "sofa", w: 3, h: 2, dy: 1 },
  mesaCafe: { sprite: "mesa_cafe", w: 2, h: 1, dy: 2 },
};

function ordenaGrupos(grupos: string[]): string[] {
  const conhecidos = ORDEM_GRUPOS.filter((g) => grupos.includes(g));
  const resto = grupos.filter((g) => !ORDEM_GRUPOS.includes(g));
  return [...conhecidos, ...resto];
}

/* --------------------------------------------------------- montagem --- */

export function montarAndar(sistemas: SistemaEco[], conectores: ConectorEco[]): Andar {
  const porGrupo = new Map<string, SistemaEco[]>();
  for (const s of sistemas) {
    const g = s.grupo || "Outros";
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g)!.push(s);
  }
  const grupos = ordenaGrupos([...porGrupo.keys()]);

  const dims = grupos.map((g) => ({
    grupo: g,
    sistemas: porGrupo.get(g) ?? [],
    ...tamanhoDaSala((porGrupo.get(g) ?? []).length),
  }));
  const fileiras = reparte(dims, melhorDivisao(dims));

  const largMiolo = Math.max(
    ...fileiras.map((f) => f.reduce((s, x) => s + x.w, 0) + (f.length - 1) * VAO_ENTRE_SALAS),
  );
  const altMiolo =
    fileiras.reduce((s, f) => s + Math.max(...f.map((x) => x.h)), 0) + CORREDOR_MEIO * (fileiras.length - 1);
  const colunas = largMiolo + CORREDOR_LATERAL * 2 + 2;
  const linhasGrade = altMiolo + CORREDOR_TOPO + CORREDOR_RODAPE + 2;

  const o = novaObra(colunas, linhasGrade);
  pisoEm(o, 1, 1, colunas - 2, linhasGrade - 2, true);

  // parede externa do andar
  for (let x = 0; x < colunas; x++) {
    por(o, "parede_h", x, 0);
    marcar(o, x, 0, CELULA.PAREDE);
    por(o, "parede_h", x, linhasGrade - 1);
    marcar(o, x, linhasGrade - 1, CELULA.PAREDE);
  }
  for (let y = 1; y < linhasGrade - 1; y++) {
    por(o, "parede_v", 0, y);
    marcar(o, 0, y, CELULA.PAREDE);
    por(o, "parede_v", colunas - 1, y);
    marcar(o, colunas - 1, y, CELULA.PAREDE);
  }
  por(o, "porta_fechada", 2, 0); // entrada do andar
  for (let x = 7; x < colunas - 7; x += 8) por(o, "janela_dupla", x, 0);

  const salas: Sala[] = [];
  const mesas: Mesa[] = [];
  const corredores: number[] = [];

  let ty = CORREDOR_TOPO + 1;
  for (const fileira of fileiras) {
    const somaW = fileira.reduce((s, x) => s + x.w, 0);
    const vaos = Math.max(1, fileira.length - 1);
    const folga = largMiolo - somaW - vaos * VAO_ENTRE_SALAS;
    const extra = fileira.length > 1 ? Math.floor(folga / vaos) : 0;
    let tx = CORREDOR_LATERAL + 1 + (fileira.length > 1 ? 0 : Math.floor(folga / 2));
    const alturaFileira = Math.max(...fileira.map((d) => d.h));
    const linhaIdx = corredores.length;
    corredores.push((ty + alturaFileira + Math.floor(CORREDOR_MEIO / 2)) * TILE);

    for (const d of fileira) {
      montarSala(o, tx, ty, d, alturaFileira, linhaIdx, salas, mesas, corredores[linhaIdx]);
      tx += d.w + VAO_ENTRE_SALAS + extra;
    }
    ty += alturaFileira + CORREDOR_MEIO;
  }

  const portas = montarPortasDeServico(o, conectores, colunas, linhasGrade);
  mobiliarCorredores(o, salas, colunas, linhasGrade);

  return {
    largura: colunas * TILE,
    altura: linhasGrade * TILE,
    colunas,
    linhasGrade,
    grade: o.grade,
    camadas: o.camadas,
    salas,
    mesas,
    portas,
    hallX: (CORREDOR_LATERAL + 1) * TILE,
    corredores,
    mesaPorSistema: new Map(mesas.map((m) => [m.sistemaId, m])),
    portaPorConector: new Map(portas.map((p) => [p.conectorId, p])),
  };
}

interface Dim {
  grupo: string;
  sistemas: SistemaEco[];
  w: number;
  h: number;
  colunas: number;
  fileiras: number;
}

function montarSala(
  o: Obra,
  x0: number,
  y0: number,
  d: Dim,
  altura: number,
  linha: number,
  salas: Sala[],
  mesas: Mesa[],
  corredorY: number,
) {
  const h = altura;
  const portaTx = x0 + Math.floor((d.w - 3) / 2);
  const salaIdx = salas.length;

  pisoEm(o, x0 + 1, y0 + 1, d.w - 2, h - 2);
  for (let x = x0; x < x0 + d.w; x++) {
    por(o, "parede_h", x, y0);
    marcar(o, x, y0, CELULA.PAREDE);
    por(o, "parede_h", x, y0 + h - 1);
    marcar(o, x, y0 + h - 1, CELULA.PAREDE);
  }
  for (let y = y0 + 1; y < y0 + h - 1; y++) {
    por(o, "parede_v", x0, y);
    marcar(o, x0, y, CELULA.PAREDE);
    por(o, "parede_v", x0 + d.w - 1, y);
    marcar(o, x0 + d.w - 1, y, CELULA.PAREDE);
  }
  por(o, "parede_canto", x0, y0);
  por(o, "parede_canto", x0 + d.w - 1, y0);
  por(o, "parede_canto", x0, y0 + h - 1);
  por(o, "parede_canto", x0 + d.w - 1, y0 + h - 1);

  // porta na parede de baixo, virada para o corredor
  por(o, "porta_aberta", portaTx, y0 + h - 1);
  for (let i = 0; i < 3; i++) marcar(o, portaTx + i, y0 + h - 1, CELULA.PORTA);

  // vidro ao lado da porta: dá cara de escritório e deixa ver quem está dentro
  if (portaTx - 3 > x0) por(o, "janela_simples", portaTx - 3, y0 + h - 1);
  if (portaTx + 4 < x0 + d.w - 2) por(o, "janela_simples", portaTx + 4, y0 + h - 1);

  const receita = receitaDe(d.grupo);

  // parede do fundo: os itens da receita, espalhados pela largura útil
  const util = d.w - 2;
  receita.parede.forEach((nome, i) => {
    const sprite: SpriteId =
      nome === "quadroBranco"
        ? "quadro_branco"
        : nome === "relogio"
          ? (`relogio_${(9 * 60 + 25 + i * 17) % 720}` as SpriteId)
          : (`quadro_${(d.w + i) % 4}` as SpriteId);
    const larg = Math.round(tamanhoDaPeca(sprite).w / TILE);
    const fatia = util / receita.parede.length;
    const px = x0 + 1 + Math.round(i * fatia + (fatia - larg) / 2);
    if (px >= x0 + 1 && px + larg <= x0 + d.w - 1) por(o, sprite, px, y0, 0, 4);
  });

  salas.push({
    grupo: d.grupo,
    x: x0 * TILE,
    y: y0 * TILE,
    w: d.w * TILE,
    h: h * TILE,
    portaX: (portaTx + 1) * TILE + TILE / 2,
    corredorY,
    linha,
  });

  // postos de trabalho
  d.sistemas.forEach((sis, i) => {
    const col = i % d.colunas;
    const fila = Math.floor(i / d.colunas);
    const mx = x0 + 1 + FOLGA + col * POSTO_L;
    const my = y0 + 1 + fila * POSTO_A;

    bloco(o, "mesa_pequena", mx, my, 3, 2);
    // o monitor NÃO entra na camada estática: quem o desenha é o quadro, com
    // a cor da tela que corresponde à saúde do sistema naquele instante
    if (i % 2 === 0) por(o, "telefone", mx + 2, my, 4, 2);
    bloco(o, "cadeira", mx + 3, my, 2, 2);

    const pessoaTx = mx;
    const pessoaTy = my + 2;
    const pe = pontoDoTile(pessoaTx, pessoaTy);
    mesas.push({
      sistemaId: sis.id,
      nome: sis.nome,
      grupo: d.grupo,
      x: mx * TILE,
      y: my * TILE,
      pessoaX: pe.x,
      pessoaY: pe.y,
      cadeiraX: (mx + 3) * TILE,
      cadeiraY: my * TILE,
      saidaX: pe.x,
      saidaY: pe.y,
      salaIdx,
      tileX: pessoaTx,
      tileY: pessoaTy,
      monitorX: mx * TILE + 8,
      monitorY: my * TILE - 12,
    });
  });

  /*
   * Faixa de móveis do fundo.
   *
   * A coluna x0+1 fica SEMPRE livre, de cima a baixo: é o corredor interno da
   * sala. Sem ele a faixa fecha a largura inteira e o BLINK não consegue sair
   * da mesa para a porta.
   */
  const yb = y0 + 1 + d.fileiras * POSTO_A;
  const limite = x0 + d.w - 2;
  let cursor = x0 + 2;
  const poe = (peca: PecaSala): boolean => {
    const p = PECA_SPRITE[peca];
    if (cursor + p.w - 1 > limite) return false;
    bloco(o, p.sprite, cursor, yb + p.dy, p.w, p.h - p.dy);
    cursor += p.w + 1;
    return true;
  };
  for (const peca of receita.fundo) poe(peca);
  for (const peca of receita.sobra) poe(peca);

  // a coluna livre à direita das mesas é o canto natural da sala
  const xCanto = x0 + d.w - 2;
  if (receita.canto === "bebedouro") blocoSeLivre(o, "bebedouro", xCanto, y0 + 1, 1, 3);
  else blocoSeLivre(o, "planta_pequena", xCanto, y0 + 1, 1, 2);

  // tapete no miolo, entre as mesas e a faixa de móveis
  if (yb - 2 > y0 + 1) por(o, "tapete", x0 + 2, yb - 2);
}

function montarPortasDeServico(
  o: Obra,
  conectores: ConectorEco[],
  colunas: number,
  linhas: number,
): PortaExterna[] {
  const ty = linhas - 1;
  const passo = 5;
  const largura = conectores.length * passo - 2;
  let tx = Math.max(13, Math.floor((colunas - largura) / 2));
  const portas: PortaExterna[] = [];
  for (const c of conectores) {
    if (tx + 3 >= colunas - 1) break;
    por(o, "porta_fechada", tx, ty);
    por(o, "capacho", tx, ty - 1);
    for (let i = 0; i < 3; i++) marcar(o, tx + i, ty, CELULA.PORTA);
    const frente = pontoDoTile(tx + 1, ty - 1);
    portas.push({
      conectorId: c.id,
      nome: c.nome,
      x: tx * TILE,
      y: ty * TILE,
      frenteX: frente.x,
      frenteY: frente.y,
      tileX: tx + 1,
      tileY: ty - 1,
    });
    tx += passo;
  }
  return portas;
}

/**
 * O corredor é parte do escritório, não a sobra entre as salas.
 *
 * Duas regras: a TRILHA de piso costura o andar inteiro e diz por onde se
 * anda; a decoração só encosta na parede das salas, com o guarda recusando
 * qualquer peça que toque numa soleira.
 */
function mobiliarCorredores(o: Obra, salas: Sala[], colunas: number, linhas: number) {
  const passa = (tx: number, ty: number, peca: SpriteId = "trilha") => {
    if (ler(o, tx, ty) === CELULA.LIVRE) por(o, peca, tx, ty);
  };

  const bases = [...new Set(salas.map((s) => (s.y + s.h) / TILE))];
  for (const y of bases) {
    for (let x = 1; x < colunas - 1; x++) {
      passa(x, y + 2, "trilha_topo");
      passa(x, y + 3, "trilha_base");
    }
  }
  // ligações verticais nos VÃOS entre salas, que é por onde se atravessa
  const vaos: number[] = [];
  salas.forEach((s, i) => {
    const viz = salas[i + 1];
    if (viz && viz.y === s.y) {
      vaos.push(Math.floor((s.x + s.w + viz.x) / 2 / TILE));
    }
  });
  for (const x of [...new Set(vaos)]) {
    for (let y = 1; y < linhas - 1; y++) passa(x, y);
  }

  /*
   * Um grupo por sala, alternando o lado. Um banco de cada lado de cada porta
   * virava uma sequência repetitiva de parede a parede — o oposto de
   * decoração.
   */
  salas.forEach((s, i) => {
    const yBaixo = (s.y + s.h) / TILE;
    const sx = s.x / TILE;
    const sw = s.w / TILE;
    const esquerda = i % 2 === 0;
    const xg = esquerda ? sx + 1 : sx + sw - 4;
    if (i % 3 === 2) {
      blocoSeLivre(o, "planta_canto", xg, yBaixo, 3, 3);
    } else {
      blocoSeLivre(o, "banco", xg, yBaixo, 2, 1);
      blocoSeLivre(o, "planta_pequena", esquerda ? xg + 3 : xg - 1, yBaixo, 1, 2);
    }
    const viz = salas[i + 1];
    if (viz && viz.y === s.y && (viz.x - (s.x + s.w)) / TILE >= 3) {
      const xv = sx + sw + Math.floor((viz.x / TILE - sx - sw - 1) / 2);
      if (i % 2 === 0) blocoSeLivre(o, "bebedouro", xv, s.y / TILE + 2, 1, 3);
      else blocoSeLivre(o, "planta_media", xv, s.y / TILE + 2, 2, 3);
    }
  });

  // paredes externas: poucos pontos, sempre rente, nada no caminho
  for (const y of [4, Math.floor(linhas / 2), linhas - 12]) {
    blocoSeLivre(o, "bebedouro", 1, y, 1, 3);
    blocoSeLivre(o, "planta_pequena", colunas - 2, y + 2, 1, 2);
  }

  /*
   * Faixa inferior = ÁREA DE SERVIÇO do andar, não sobra de mapa.
   * Recepção à esquerda, entrega à direita, espera no miolo.
   */
  const yr = linhas - CORREDOR_RODAPE;
  for (let x = 1; x < colunas - 1; x++) passa(x, yr + 1);
  por(o, "tapete", 4, yr + 2);
  blocoSeLivre(o, "balcao", 3, yr, 4, 2);
  blocoSeLivre(o, "planta_canto", 8, yr, 3, 3);
  blocoSeLivre(o, "sofa", 3, yr + 3, 3, 2);
  blocoSeLivre(o, "mesa_cafe", 7, yr + 4, 2, 1);
  blocoSeLivre(o, "balcao", colunas - 7, yr, 4, 2);
  blocoSeLivre(o, "estante", colunas - 11, yr, 3, 3);
  blocoSeLivre(o, "planta_canto", colunas - 15, yr, 3, 3);
  blocoSeLivre(o, "sofa", colunas - 7, yr + 3, 3, 2);

  const meio = Math.floor(colunas / 2);
  for (const xg of [meio - 22, meio, meio + 22]) {
    if (xg < 12 || xg > colunas - 14) continue;
    blocoSeLivre(o, "banco", xg, yr, 2, 1);
    blocoSeLivre(o, "banco", xg + 3, yr, 2, 1);
    blocoSeLivre(o, "planta_media", xg + 6, yr, 2, 3);
  }
}

/* ----------------------------------------------------------- rotas --- */

/**
 * Busca em largura na MESMA grade que desenhou o mapa.
 *
 * `evitar` são células que o caminho não pode cruzar mesmo sendo andáveis —
 * é como um personagem parado vira obstáculo para o outro. Sem o argumento,
 * o resultado é exatamente o de antes.
 */
export function rotaEmTiles(
  andar: Andar,
  de: { x: number; y: number },
  para: { x: number; y: number },
  evitar?: ReadonlySet<number>,
): [number, number][] | null {
  const chave = (x: number, y: number) => y * andar.colunas + x;
  const livre = (x: number, y: number) => andavel(andar, x, y) && !evitar?.has(chave(x, y));
  const veio = new Map<number, number>();
  const inicio = chave(de.x, de.y);
  veio.set(inicio, -1);
  const fila: [number, number][] = [[de.x, de.y]];
  const alvo = chave(para.x, para.y);
  let achou = inicio === alvo;

  for (let i = 0; i < fila.length && !achou; i++) {
    const [x, y] = fila[i];
    const vizinhos: [number, number][] = [
      [x + 1, y],
      [x - 1, y],
      [x, y + 1],
      [x, y - 1],
    ];
    for (const [nx, ny] of vizinhos) {
      const k = chave(nx, ny);
      if (veio.has(k) || !livre(nx, ny)) continue;
      veio.set(k, chave(x, y));
      if (k === alvo) {
        achou = true;
        break;
      }
      fila.push([nx, ny]);
    }
  }
  if (!achou) return null;

  const rota: [number, number][] = [];
  let atual = alvo;
  while (atual !== -1) {
    rota.unshift([atual % andar.colunas, Math.floor(atual / andar.colunas)]);
    atual = veio.get(atual) ?? -1;
  }
  return rota;
}

/**
 * Achata a rota: só guarda os pontos onde ela dobra.
 *
 * Sem isso o motor recebe um waypoint por tile e recalcula direção 90 vezes
 * numa travessia — e a caminhada fica trêmula.
 */
function dobras(rota: [number, number][]): Ponto[] {
  const pontos: Ponto[] = [];
  for (let i = 0; i < rota.length; i++) {
    const ant = rota[i - 1];
    const prox = rota[i + 1];
    if (!ant || !prox || (prox[0] - rota[i][0]) * (rota[i][1] - ant[1]) !== (prox[1] - rota[i][1]) * (rota[i][0] - ant[0])) {
      pontos.push(pontoDoTile(rota[i][0], rota[i][1]));
    }
  }
  return pontos;
}

export function caminhoEntreTiles(
  andar: Andar,
  de: { x: number; y: number },
  para: { x: number; y: number },
  evitar?: ReadonlySet<number>,
): Ponto[] | null {
  const rota = rotaEmTiles(andar, de, para, evitar);
  return rota ? dobras(rota) : null;
}

/** Índice de uma célula na grade — a chave usada por `evitar`. */
export function chaveDaCelula(andar: Andar, tx: number, ty: number): number {
  return ty * andar.colunas + tx;
}

/** Caminho de uma mesa até outra, pela grade de colisão. */
export function caminhoEntreMesas(andar: Andar, de: Mesa, para: Mesa): Ponto[] {
  const p = caminhoEntreTiles(andar, { x: de.tileX, y: de.tileY }, { x: para.tileX, y: para.tileY });
  return p ?? [{ x: de.pessoaX, y: de.pessoaY }];
}

/** Caminho de uma porta externa até a mesa que consome aquele conector. */
export function caminhoDaPorta(andar: Andar, porta: PortaExterna, para: Mesa): Ponto[] {
  const p = caminhoEntreTiles(
    andar,
    { x: porta.tileX, y: porta.tileY },
    { x: para.tileX, y: para.tileY },
  );
  return p ?? [{ x: porta.frenteX, y: porta.frenteY }];
}

/**
 * Ponto de encontro entre dois personagens.
 *
 * Entre áreas diferentes é sempre no CORREDOR: conversar dentro da sala
 * alheia obrigaria um a invadir o posto do outro sem necessidade. Entre
 * colegas da MESMA sala o corredor não faz sentido — sair da sala para falar
 * com quem está na mesa ao lado é absurdo —, então o encontro é na própria
 * sala.
 *
 * O segundo para a DOIS tiles do primeiro: a célula vizinha fica a 16 px e o
 * BLINK tem 22 de largura; colados, os dois sprites se sobrepõem.
 */
export function pontoDeEncontro(
  andar: Andar,
  a: { x: number; y: number },
  b: { x: number; y: number },
  mesmaSala: boolean,
): { um: { x: number; y: number }; outro: { x: number; y: number } } | null {
  const rota = rotaEmTiles(andar, a, b);
  const minimo = mesmaSala ? 4 : 8;
  if (!rota || rota.length < minimo) return null;

  const dentroDeSala = (x: number, y: number) =>
    andar.salas.some(
      (s) =>
        x > s.x / TILE && x < (s.x + s.w) / TILE - 1 && y > s.y / TILE && y < (s.y + s.h) / TILE - 1,
    );
  const serve = (x: number, y: number) =>
    andavel(andar, x, y) && (mesmaSala || !dentroDeSala(x, y));

  const meio = Math.floor(rota.length / 2);

  /*
   * O ponto de parada de cada um sai DO PRÓPRIO CAMINHO, e é isso que impede
   * os dois de se atravessarem.
   *
   * `um` fica na célula do meio da rota e `outro` duas casas adiante, no
   * sentido em que a rota segue para B. Assim A para antes e B para depois:
   * cada um chega pelo seu lado e ninguém precisa passar por cima do outro.
   * Escolher a orientação sem olhar de que lado cada um vinha era o que
   * punha os dois no mesmo pixel.
   *
   * Só vale se o trecho for HORIZONTAL: o BLINK tem `frente|esquerda|direita`
   * e o olhar é um desvio de 1 px nos olhos, então de lado eles se encaram e
   * de cima para baixo, não.
   */
  for (const exigirHorizontal of [true, false]) {
    for (let d = 0; d < rota.length; d++) {
      for (const k of [meio + d, meio - d]) {
        if (k < 1 || k + 2 >= rota.length) continue;
        const [x, y] = rota[k];
        const dx = rota[k + 1][0] - x;
        const dy = rota[k + 1][1] - y;
        if (exigirHorizontal && dy !== 0) continue;
        const ax = x + dx * 2;
        const ay = y + dy * 2;
        if (!serve(x, y) || !serve(x + dx, y + dy) || !serve(ax, ay)) continue;
        return { um: { x, y }, outro: { x: ax, y: ay } };
      }
    }
  }

  /*
   * Sem trecho reto de três casas no caminho: cai para a busca por vizinho,
   * ainda preferindo lado a lado. Aqui os dois podem se cruzar de raspão na
   * aproximação, porque não há como garantir a ordem de chegada.
   */
  const HORIZONTAL: [number, number][] = [
    [1, 0],
    [-1, 0],
  ];
  const VERTICAL: [number, number][] = [
    [0, 1],
    [0, -1],
  ];
  for (const dirs of [HORIZONTAL, [...HORIZONTAL, ...VERTICAL]]) {
    for (let d = 0; d < rota.length; d++) {
      for (const k of [meio + d, meio - d]) {
        if (k < 1 || k >= rota.length - 1) continue;
        const [x, y] = rota[k];
        if (!serve(x, y)) continue;
        const dir = dirs.find(([ dx, dy ]) => serve(x + dx, y + dy) && serve(x + dx * 2, y + dy * 2));
        if (dir) return { um: { x, y }, outro: { x: x + dir[0] * 2, y: y + dir[1] * 2 } };
      }
    }
  }
  return null;
}

/** Largura de circulação, em pixels, medida no ponto mais estreito. */
export function larguraMinimaDeCorredor(andar: Andar): number {
  let menor = Infinity;
  for (let y = 1; y < andar.linhasGrade - 1; y++) {
    for (let x = 1; x < andar.colunas - 1; x++) {
      if (!andavel(andar, x, y)) continue;
      let faixa = 1;
      for (let k = 1; andavel(andar, x + k, y); k++) faixa++;
      for (let k = 1; andavel(andar, x - k, y); k++) faixa++;
      let coluna = 1;
      for (let k = 1; andavel(andar, x, y + k); k++) coluna++;
      for (let k = 1; andavel(andar, x, y - k); k++) coluna++;
      menor = Math.min(menor, Math.max(faixa, coluna) * TILE);
    }
  }
  return menor === Infinity ? 0 : menor;
}

export { PERSONAGEM_H, PERSONAGEM_W };
