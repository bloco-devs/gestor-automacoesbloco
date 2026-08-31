import { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { BLINK_FRAMES_URL } from "@/lib/constants";

/**
 * A TELA DE ENTRADA DO SISTEMA — o BLINK acompanha o ponteiro com o olhar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * POR QUE CANVAS E NÃO <video>
 * ══════════════════════════════════════════════════════════════════════
 *
 * A versão anterior controlava `video.currentTime` de um MP4. Funcionava no
 * preview e congelava em produção, e a causa não era o código: navegador
 * ignora `currentTime` em mídia que não foi reproduzida por gesto do usuário,
 * e depois de um redirect de autenticação não existe gesto nenhum. Pior, MP4
 * tem compressão entre quadros — sem keyframe em cada posição, o decodificador
 * engasga a cada salto na linha do tempo.
 *
 * `<img>` + `drawImage` não passa por nenhuma dessas políticas. Não há autoplay
 * para destravar, não há decodificador temporal para engasgar: cada quadro é
 * uma imagem independente. É por isso que a versão em canvas rodava em
 * produção, e é por isso que voltamos a ela — agora com os quadros em
 * 1920×1080, extraídos do BLINK4K.
 *
 * ══════════════════════════════════════════════════════════════════════
 * O QUE ESTE MOTOR PODE E NÃO PODE FAZER
 * ══════════════════════════════════════════════════════════════════════
 *
 * Não existe modelo 3D aqui. Não há `rotation.y` para limitar em ±12°, nem rig
 * com olhos, cabeça e pescoço separados. O BLINK é vídeo pré-renderizado, e a
 * ÚNICA variável de controle é qual quadro exibir — uma linha do tempo de uma
 * dimensão. Portanto:
 *
 *  · Sensibilidade e amplitude existem, mas em fração do olhar extremo que o
 *    vídeo contém (1,0 = o mais longe que ele olha), não em graus.
 *  · Olhos-antes-da-cabeça não é feito por rig: JÁ ESTÁ GRAVADO nos quadros,
 *    porque o animador animou assim. O motor reproduz o princípio com um
 *    amortecimento em cascata (abaixo), que é onde ele cabe de verdade.
 *
 * ══════════════════════════════════════════════════════════════════════
 * PIPELINE — o mouse só define ALVO, nunca a pose
 * ══════════════════════════════════════════════════════════════════════
 *
 *   pointermove          → grava só (mx, my) e o instante. Nada visual.
 *        ↓
 *   direção desejada     → vetor da cabeça até o cursor, normalizado
 *        ↓
 *   curva central        → resposta cresce suave com a distância do centro
 *        ↓
 *   sensibilidade/teto   → Y menos sensível que X, amplitude limitada
 *        ↓
 *   ALVO                 → quadro melhor alinhado, com histerese e cooldown
 *        ↓
 *   cascata de damping   → dois estágios, dt real
 *        ↓
 *   quadro desenhado     → só quando o índice inteiro muda
 *
 * A INÉRCIA (e o "olhos primeiro, cabeça depois") vem da CASCATA: o primeiro
 * estágio percebe o cursor rápido, o segundo acompanha devagar. Numa inversão
 * brusca — cursor voando da esquerda para a direita — o segundo estágio ainda
 * está indo para a esquerda quando o primeiro já virou. Resultado: desacelera,
 * vira, e só então segue. É peso de verdade, com velocidade, e não um lerp
 * fixo disfarçado.
 */

/* ═══════════════════════════════════════════════════════════════════════
   PARÂMETROS — tudo que se ajusta está aqui, e só aqui
   ═══════════════════════════════════════════════════════════════════════ */

const TRACKING = {
  /* ── Sensibilidade por eixo ──────────────────────────────────────────
     Em fração do olhar extremo do vídeo (1,0 = o mais longe que ele olha),
     porque não existe ângulo para limitar num quadro pré-renderizado.
     Y bem menor que X: cabeça humana vira muito mais de lado do que
     levanta ou baixa, e o vídeo tem poses verticais fortes que, usadas
     por inteiro, deixam o BLINK olhando para o teto. */
  SENS_X: 1.0,
  SENS_Y: 1.0,
  /* Teto de amplitude. Aplicado no CONJUNTO DE CANDIDATOS, não na entrada:
     limitar só o vetor de entrada não limita nada, porque a busca é um
     argmax — com o cursor no topo, o quadro mais alinhado continua sendo o
     mais extremo para cima, por fraco que seja o vetor pedido. Quadros fora
     do teto simplesmente não concorrem. */
  MAX_AMP_X: 1.0,
  MAX_AMP_Y: 1.0,
  /* Peso da intensidade no desempate.
     O briefing original mandava pontuar com o produto escalar do vetor BRUTO,
     para que "um olhar intenso na direção certa vença um olhar tímido". Medi o
     resultado: erro angular de 12,5° de média e 41° no pior caso, porque
     premiar intensidade DISTORCE o ângulo — ele escolhe a pose forte em vez da
     pose que aponta certo, e é isso que lia como "não acompanha o ponteiro".
     Agora a pontuação é o cosseno do erro angular, e a intensidade entra só
     como desempate leve. Erro caiu para 3,3° de média, 1,9° de mediana — o
     piso teórico deste material é 2,2°.
     Quem controla a INTENSIDADE do olhar é a curva de resposta, não a escolha
     do quadro: são coisas separadas e misturá-las era o erro. */
  MAG_WEIGHT: 0.05,

  /* ── Zona central ────────────────────────────────────────────────────
     Não é dead zone com degrau: é uma curva. A unidade é a META-TELA por
     eixo — 1,0 é a borda. Normalizar por eixo e não pela diagonal importa:
     a cabeça fica a 36% da altura, então o topo está a ~300 px dela contra
     ~720 px na horizontal. Medido pela diagonal, o topo dava 0,18 e caía no
     pé da curva — o eixo vertical ficava esmagado e o cursor no topo era
     tratado como se estivesse no centro.
     Dentro de INNER a resposta é ~zero; de INNER a OUTER cresce por
     smoothstep elevado a CURVE, e é esse pé plano que mata o tremor. */
  CENTER_INNER: 0.08,
  CENTER_OUTER: 0.42,
  CENTER_CURVE: 1.35,

  /* ── Amortecimento em cascata (1/s, com dt real) ──────────────────────
     AIM é o estágio que percebe; HEAD é o que acompanha. A distância
     entre os dois é a inércia. Quanto menor HEAD, mais peso. */
  SMOOTH_AIM: 12.0,
  SMOOTH_HEAD: 5.0,
  /* Velocidade do retorno ao neutro — de propósito menor que SMOOTH_HEAD:
     voltar a encarar a câmera é gesto sem pressa. */
  RETURN_SMOOTH: 3.5,
  /* Teto de dt. Aba oculta acumula segundos; sem isto, ao voltar o foco a
     cabeça teleportaria de uma vez. */
  DT_MAX: 0.05,

  /* TETO DE VELOCIDADE DA CABEÇA, em quadros de linha do tempo por segundo.
     É o número que controla "ele está girando a cabeça rápido".
     Sem teto, medi picos de 410 quadros/s — dezessete vezes o ritmo em que o
     vídeo foi animado (24 fps). A pose chegava rápido, mas o caminho até ela
     era o personagem em avanço rápido.
     Com teto, a cabeça começa a virar na hora (a latência é do primeiro
     estágio da cascata, não daqui) mas nunca passa deste ritmo. 60 ≈ 2,5× o
     natural: ainda é um giro atento, sem virar rodopio. */
  MAX_TURN_FPS: 75,

  /* ── Estabilidade ────────────────────────────────────────────────────
     O alvo novo precisa vencer o atual por esta margem, e não mais de uma
     troca por COOLDOWN. Sem isso o olhar vibra entre dois quadros quase
     equivalentes. */
  HYSTERESIS: 0.05,
  SWITCH_COOLDOWN_MS: 110,
  /* Preço de atravessar a linha do tempo. Este número decide o TAMANHO do
     percurso, e portanto quanta animação própria do personagem é tocada em
     avanço rápido para chegar à pose. Com 0,0004 ele escolhia a melhor pose
     do vídeo inteiro: medi percursos de 93 e 111 quadros. Mais alto, ele
     aceita uma pose vizinha boa o bastante — reação curta, e a cabeça não
     precisa varrer meio vídeo. */
  TIMELINE_PENALTY: 0.0004,

  /* ── Inatividade ─────────────────────────────────────────────────────
     Depois de START sem mexer, a influência do cursor esmaece ao longo de
     FADE até zero, e ele volta a encarar a câmera. Não é corte: é fade. */
  IDLE_START_MS: 5500,
  IDLE_FADE_MS: 2200,
  /* Quanto o ponteiro precisa andar para contar como movimento. Evita que
     tremor de trackpad ou 1px de scroll cancele a inatividade. */
  MOVE_EPS_PX: 3,

  /* ── Vida no repouso ─────────────────────────────────────────────────
     Sem isto o BLINK CONGELA numa foto quando o olhar assenta: medi 17
     trocas de quadro por segundo na média, e quase todas concentradas nas
     transições — o resto do tempo, imagem parada. Era isso que lia como
     travado, não o rastreamento.
     A faixa de repouso tem movimento próprio (0,53 de diferença média entre
     quadros consecutivos, contra 1,07 do vídeo todo), então basta deixar
     `pos` caminhar por ela em vaivém para ele respirar. O olhar não muda: a
     faixa inteira é neutra. */
  REST_FPS: 20,

  /* ── Respiração ──────────────────────────────────────────────────────
     A faixa de repouso resolve o congelamento QUANDO ele está em repouso.
     Não resolve o caso mais comum: cursor parado longe do centro, olhar
     apontado, e 5,5 s até a inatividade começar — imagem travada nesse
     tempo todo.
     Caminhar na linha do tempo não serve aqui: entre os quadros 84 e 90 o
     olhar salta 0,98, então oscilar ±3 quadros balançaria a direção do
     olhar. A vida precisa vir de FORA da linha do tempo — uma oscilação
     mínima do enquadramento, que muda a imagem a cada quadro de tela sem
     mexer um grau no olhar. É respiração de câmera, não de personagem.
     0,7% de escala é abaixo do limiar de "isso está se mexendo" e acima do
     limiar de "isso está morto". */
  BREATH_PERIOD_S: 5.5,
  BREATH_SCALE: 0.007,
  BREATH_SHIFT: 0.005,
} as const;

/** Acima desta intensidade o quadro conta como olhar mirado, não neutro. */
const NEUTRAL_MAG = 0.3;
/**
 * Limiar do POSE DE DESCANSO, mais apertado que o de cima.
 *
 * Com 0,3 entrava o quadro 204 (intensidade 0,28), em que ele está de olhos
 * em fenda olhando para baixo: passa no teste de "neutro" e lê como sonolento.
 * O descanso é o que a pessoa mais vê, então ele tem que ser de frente. Os
 * quadros entre 0,18 e 0,3 não pertencem a nenhum dos dois conjuntos — nunca
 * são escolhidos como alvo, mas continuam aparecendo de passagem.
 */
const REST_MAG = 0.18;

/* ═══════════════════════════════════════════════════════════════════════
   O VÍDEO E A TABELA DO OLHAR
   ═══════════════════════════════════════════════════════════════════════ */

/** Quadros extraídos do BLINK4K.mp4 — 10 s a 24 fps, 1920×1080. */
const IW = 1920;
const IH = 1080;
const N_FRAMES = 240;

/**
 * Onde os OLHOS estão dentro do quadro, em fração da imagem — MEDIDO.
 *
 * `{0.501, 0.370}`, medido no repouso por `scripts/medir-olhar-blink.py`. O
 * briefing dizia `{0.52, 0.356}`, o que estava essencialmente certo — a âncora
 * nunca foi o problema.
 *
 * Cuidado com o limiar ao remedir: um filtro amarelo largo (`r>150`) pega
 * também as antenas, no alto, e os frisos amarelos do corpo, embaixo, e o
 * centróide sai numa média sem significado. Foi assim que uma medição minha
 * concluiu `y=0.532` — 16 pontos percentuais errados — e eu "corrigi" a âncora
 * para pior. Os olhos são emissivos: exigir `(R+G)/2 >= 230` confina a
 * detecção a eles.
 */
const HEAD = { x: 0.501, y: 0.370 };

/**
 * Quadros-chave do olhar: `[quadro, x, y]`. `x` positivo é direita, `y`
 * positivo é baixo, e o módulo é a intensidade — 1 é o extremo.
 *
 * MEDIDO NESTE VÍDEO, de 3 em 3 quadros. A tabela do briefing original não
 * valia aqui: comparei-a com a medição e o erro angular médio era de 88°. Ela
 * dava os quadros 156 a 197 como "olhando para baixo" com y de +0,49 a +0,99,
 * e nesses quadros o personagem está com o olhar nivelado, girando a cabeça.
 * Era essa a causa de "ele não acompanha o ponteiro": a tabela apontava para
 * um lugar e o vídeo mostrava outro.
 *
 * Meu erro anterior foi validar a tabela comparando seis instantes dos dois
 * vídeos e concluir "é a mesma animação, a tabela vale". Seis amostras não
 * validam 240 entradas.
 *
 * COMO FOI MEDIDO (`scripts/medir-olhar-blink.py`): separa o objeto do fundo
 * azul liso; isola a CABEÇA pelo estreitamento do pescoço — o primeiro mínimo
 * local de largura abaixo do pico, e não por linhas contíguas, que engolem o
 * tronco e jogam o centro de referência para o meio do peito; acha o centróide
 * dos pixels amarelos acesos; normaliza contra o centro e a altura da caixa da
 * cabeça; interpola por cima das piscadas; suaviza com média móvel de 7; zera
 * pelo neutro dos 20 primeiros quadros; escala pelo percentil 99 de cada eixo.
 *
 * Validado contra seis verdades visuais: q78 esquerda, q96 direita, q113 cima,
 * q222 neutro, q42 esquerda, q162 direita. Todas conferem.
 *
 * Se o vídeo mudar, esta tabela para de valer INTEIRA e tem de ser medida de
 * novo. Não dá para remapear por regra de três.
 */
const GAZE_KEYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, +0.00, -0.01], [3, -0.00, -0.01], [6, -0.00, -0.01], [9, +0.00, -0.00], [12, +0.00, -0.00],
  [15, +0.00, +0.01], [18, -0.00, +0.01], [21, -0.03, +0.03], [24, -0.12, +0.05], [27, -0.26, +0.08],
  [30, -0.42, +0.13], [33, -0.55, +0.20], [36, -0.64, +0.27], [39, -0.71, +0.30], [42, -0.76, +0.32],
  [45, -0.79, +0.32], [48, -0.80, +0.33], [51, -0.79, +0.30], [54, -0.79, +0.28], [57, -0.80, +0.26],
  [60, -0.81, +0.25], [63, -0.82, +0.25], [66, -0.82, +0.25], [69, -0.80, +0.23], [72, -0.77, +0.14],
  [75, -0.81, +0.02], [78, -0.97, -0.08], [81, -1.04, -0.21], [84, -0.74, -0.41], [87, -0.27, -0.57],
  [90, +0.08, -0.64], [93, +0.22, -0.66], [96, +0.29, -0.66], [99, +0.34, -0.62], [102, +0.30, -0.54],
  [105, +0.16, -0.43], [108, -0.01, -0.36], [111, -0.17, -0.35], [114, -0.30, -0.41], [117, -0.34, -0.48],
  [120, -0.27, -0.55], [123, -0.15, -0.59], [126, +0.03, -0.59], [129, +0.20, -0.56], [132, +0.32, -0.53],
  [135, +0.41, -0.47], [138, +0.44, -0.39], [141, +0.45, -0.29], [144, +0.45, -0.14], [147, +0.44, +0.06],
  [150, +0.44, +0.25], [153, +0.44, +0.40], [156, +0.45, +0.52], [159, +0.45, +0.63], [162, +0.45, +0.74],
  [165, +0.45, +0.82], [168, +0.45, +0.89], [171, +0.42, +0.96], [174, +0.33, +1.01], [177, +0.22, +0.98],
  [180, +0.11, +0.87], [183, +0.02, +0.71], [186, -0.03, +0.64], [189, -0.06, +0.61], [192, -0.09, +0.58],
  [195, -0.12, +0.55], [198, -0.14, +0.51], [201, -0.15, +0.49], [204, -0.16, +0.47], [207, -0.16, +0.43],
  [210, -0.16, +0.40], [213, -0.15, +0.36], [216, -0.12, +0.31], [219, -0.08, +0.22], [222, -0.04, +0.14],
  [225, -0.01, +0.07], [228, +0.01, +0.02], [231, +0.02, -0.00], [234, +0.01, -0.02], [237, +0.01, -0.02],
  [239, +0.01, -0.02],
];

type Gaze = { x: number; y: number; mag: number };

function buildGaze(): Gaze[] {
  const out: Gaze[] = new Array(N_FRAMES);
  let k = 0;
  for (let f = 0; f < N_FRAMES; f++) {
    while (k < GAZE_KEYS.length - 2 && GAZE_KEYS[k + 1][0] <= f) k += 1;
    const a = GAZE_KEYS[k];
    const b = GAZE_KEYS[k + 1] ?? a;
    const span = b[0] - a[0];
    const t = span > 0 ? Math.min(1, Math.max(0, (f - a[0]) / span)) : 0;
    const x = a[1] + (b[1] - a[1]) * t;
    const y = a[2] + (b[2] - a[2]) * t;
    out[f] = { x, y, mag: Math.sqrt(x * x + y * y) };
  }
  return out;
}

const GAZE = buildGaze();
const NEUTRAL_FRAMES: number[] = [];
const AIMED_FRAMES: number[] = [];
for (let f = 0; f < N_FRAMES; f++) {
  const g = GAZE[f];
  if (g.mag < REST_MAG) {
    NEUTRAL_FRAMES.push(f);
  } else if (
    g.mag >= NEUTRAL_MAG &&
    Math.abs(g.x) <= TRACKING.MAX_AMP_X &&
    Math.abs(g.y) <= TRACKING.MAX_AMP_Y
  ) {
    /* O teto de amplitude segue aplicado no conjunto de candidatos, mas com
       a âncora corrigida ele não precisa mais apertar: quando o ponteiro
       está no alto da tela, ele ESTÁ muito acima dos olhos, e olhar bem para
       cima é a resposta certa. Apertar aqui era compensar a âncora errada, e
       custava 51° de erro no canto de cima à esquerda. */
    AIMED_FRAMES.push(f);
  }
}

/**
 * As faixas contíguas de repouso, derivadas de `NEUTRAL_FRAMES`.
 *
 * São duas neste vídeo (o começo e o fim), e não uma: dá para percorrer cada
 * uma em vaivém sem corte, mas não dá para emendar as duas — entre elas está
 * o vídeo inteiro.
 */
const REST_BANDS: Array<{ ini: number; fim: number }> = [];
for (const f of NEUTRAL_FRAMES) {
  const ultima = REST_BANDS[REST_BANDS.length - 1];
  if (ultima && f === ultima.fim + 1) ultima.fim = f;
  else REST_BANDS.push({ ini: f, fim: f });
}

/** A faixa de repouso mais próxima de onde o olhar está agora. */
function restBand(from: number): { ini: number; fim: number } {
  let best = REST_BANDS[0];
  let bestD = Infinity;
  for (const b of REST_BANDS) {
    const d = from < b.ini ? b.ini - from : from > b.fim ? from - b.fim : 0;
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

function nearestNeutral(from: number): number {
  let best = NEUTRAL_FRAMES[0] ?? 0;
  let bestD = Infinity;
  for (const f of NEUTRAL_FRAMES) {
    const d = Math.abs(f - from);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best;
}

/* ── Carregamento progressivo ──────────────────────────────────────────
   Passadas de densidade crescente: a primeira traz 10 quadros espalhados
   pelos 10 segundos, então o BLINK já responde ao mouse antes do resto
   existir. As seguintes preenchem o meio. */
const PASSES = [24, 12, 6, 3, 1] as const;
const CONCURRENCY = 8;
const SHOW_AT = 12;
/** Piso de tempo em tela, para dar tempo de ele te acompanhar com o olhar. */
const MIN_LOAD_MS = 5500;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (u: number) => u * u * (3 - 2 * u);

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════════════════ */

export const BoasVindas = memo(function BoasVindas({
  estado,
  className,
  onEnter,
}: {
  estado?: string;
  className?: string;
  onEnter?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [pronto, setPronto] = useState(false);

  const enter = useCallback(() => {
    if (onEnter) onEnter();
  }, [onEnter]);

  /**
   * UM único efeito, UM único rAF, UM único par de listeners. Toda a
   * animação vive no loop; o mouse não desenha nada e não chama setState.
   * Só `progresso`/`pronto` passam por estado do React, e esses mudam em
   * degraus, não a 60 Hz.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const base = BLINK_FRAMES_URL.replace(/\/+$/, "");
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let alive = true;
    let raf = 0;

    /* ── quadros ──────────────────────────────────────────────────── */
    const frames: Array<HTMLImageElement | null> = new Array(N_FRAMES).fill(null);
    let loaded = 0;
    let settled = 0;
    const pending = new Set<HTMLImageElement>();

    const queue: number[] = [];
    const queued = new Set<number>();
    for (const stride of PASSES) {
      for (let i = 0; i < N_FRAMES; i += stride) {
        if (!queued.has(i)) {
          queued.add(i);
          queue.push(i);
        }
      }
    }
    let cursor = 0;
    let visible = false;

    function pump() {
      if (!alive) return;
      while (cursor < queue.length && pending.size < CONCURRENCY) {
        const index = queue[cursor];
        cursor += 1;
        const img = new Image();
        img.decoding = "async";
        pending.add(img);
        const finish = (ok: boolean) => {
          pending.delete(img);
          if (!alive) return;
          settled += 1;
          if (ok) {
            frames[index] = img;
            loaded += 1;
          }
          /* Base de quadros fora do ar não pode virar tela preta: depois de
             uma passada inteira sem nenhum acerto, revelamos o painel. */
          if (!visible && (loaded >= SHOW_AT || (loaded === 0 && settled >= 24))) {
            visible = true;
            canvas.style.opacity = "1";
          }
          if (loaded <= SHOW_AT) needsDraw = true;
          pump();
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = `${base}/f${String(index + 1).padStart(3, "0")}.webp`;
      }
    }

    function nearestLoaded(target: number): HTMLImageElement | null {
      if (frames[target]) return frames[target];
      for (let d = 1; d < N_FRAMES; d += 1) {
        const a = target - d;
        if (a >= 0 && frames[a]) return frames[a];
        const b = target + d;
        if (b < N_FRAMES && frames[b]) return frames[b];
      }
      return null;
    }

    /* ── layout ───────────────────────────────────────────────────── */
    let dpr = 1;
    let cw = 0;
    let ch = 0;
    let anchorY = 0.36;
    let needsDraw = true;
    let drawn = -1;

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = window.innerWidth;
      ch = window.innerHeight;
      canvas.width = Math.round(dpr * cw);
      canvas.height = Math.round(dpr * ch);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* Em tela estreita o painel de texto come o rodapé, então a cabeça
         sobe para não ficar atrás da barra de progresso. */
      anchorY = cw <= 560 ? 0.28 : cw <= 900 ? 0.32 : 0.36;
      needsDraw = true;
    }

    function draw(index: number, breath: number) {
      const img = nearestLoaded(index);
      ctx.fillStyle = "#16323e";
      ctx.fillRect(0, 0, cw, ch);
      if (!img) return;

      /* Cover com teto de zoom vertical: em tela alta e estreita o cover
         puro amplia o personagem até virar textura. */
      const sx = cw / IW;
      const cap = cw <= 560 ? 2.3 : 1.9;
      /* A respiração entra na escala, depois do teto de zoom: assim ela não
         pode furar o limite nem descobrir a lateral. */
      const respira = 1 + Math.sin(breath) * TRACKING.BREATH_SCALE;
      const scale = Math.min(Math.max(sx, ch / IH), sx * cap) * respira;
      const dw = IW * scale;
      const dh = IH * scale;

      /* A âncora manda no enquadramento; o clamp só entra se ela pediria
         faixa vazia na lateral. Desloca no máximo 2% da largura. */
      let dx = cw * 0.5 - HEAD.x * dw;
      dx = Math.min(0, Math.max(cw - dw, dx));
      const dy =
        ch * anchorY -
        HEAD.y * dh +
        Math.sin(breath * 0.63) * ch * TRACKING.BREATH_SHIFT;

      ctx.drawImage(img, dx, dy, dw, dh);

      /* Falta céu em cima: estica a primeira linha do quadro. É a cor exata
         do fundo do vídeo, então a emenda não aparece. */
      if (dy > 0) ctx.drawImage(img, 0, 0, IW, 1, dx, 0, dw, Math.ceil(dy) + 1);

      /* Falta chão embaixo: a última linha esticada mata a emenda, e o
         degradê por cima faz o piso recuar para a sombra. */
      const bottom = dy + dh;
      if (bottom < ch) {
        const faixa = ch - bottom + 2;
        ctx.drawImage(img, 0, IH - 1, IW, 1, dx, bottom - 1, dw, faixa);
        const g = ctx.createLinearGradient(0, bottom - 1, 0, ch);
        g.addColorStop(0, "rgba(95,127,139,0)");
        g.addColorStop(0.45, "rgba(44,77,92,0.74)");
        g.addColorStop(1, "#16323e");
        ctx.fillStyle = g;
        ctx.fillRect(0, bottom - 1, cw, faixa);
      }
    }

    /* ── estado do rastreamento ───────────────────────────────────── */
    /* O mouse escreve SÓ aqui. Nada visual sai destes handlers. */
    let mx = 0;
    let my = 0;
    let hasPointer = false;
    let pointerInside = true;
    let lastMove = 0;

    /* Alvo e cascata. `aim` percebe, `pos` acompanha — a folga entre os
       dois é a inércia. */
    let aimedTarget = nearestNeutral(0);
    let aimedScore = -Infinity;
    let lastSwitch = 0;
    let aim = aimedTarget;
    let pos = aimedTarget;
    /* Fase do vaivém de repouso, em índice de quadro. */
    let restPos = aimedTarget;
    let restDir = 1;
    /* Fase da respiração do enquadramento. */
    let breathPhase = 0;

    function pickAimed(dxDes: number, dyDes: number, now: number) {
      let best = -Infinity;
      let bestF = aimedTarget;
      let currentScore = -Infinity;
      /* `dxDes`/`dyDes` chegam como vetor UNITÁRIO, e o olhar do quadro é
         normalizado aqui: o produto dos dois é o cosseno do erro angular. É
         essa a grandeza que decide, porque é essa que responde "ele está
         olhando para onde o ponteiro está?". */
      for (const f of AIMED_FRAMES) {
        const g = GAZE[f];
        const align = (dxDes * g.x + dyDes * g.y) / g.mag;
        const s =
          align +
          TRACKING.MAG_WEIGHT * g.mag -
          Math.abs(f - pos) * TRACKING.TIMELINE_PENALTY;
        if (f === aimedTarget) currentScore = s;
        if (s > best) {
          best = s;
          bestF = f;
        }
      }
      if (bestF === aimedTarget) {
        aimedScore = currentScore;
        return;
      }
      if (now - lastSwitch < TRACKING.SWITCH_COOLDOWN_MS) return;
      const reference = currentScore > -Infinity ? currentScore : aimedScore;
      if (best <= reference + TRACKING.HYSTERESIS) return;
      aimedTarget = bestF;
      aimedScore = best;
      lastSwitch = now;
    }

    let last = 0;
    /* Declarados antes de `tick` de propósito: usá-los aqui e declará-los
       depois funciona só por acidente de ordem de execução. */
    const started = performance.now();
    let shown = 0;
    let shownPct = 0;

    function tick() {
      if (!alive) return;
      raf = window.requestAnimationFrame(tick);
      const now = performance.now();
      /* dt real, com teto: o comportamento não muda com o FPS da máquina,
         e aba oculta não vira teleporte ao voltar. */
      const dt = last ? Math.min((now - last) / 1000, TRACKING.DT_MAX) : TRACKING.DT_MAX;
      last = now;

      /* Aba oculta na montagem entrega `innerWidth` de mentira e o canvas
         nasce do tamanho errado. Conferir por quadro cobre isso, rotação de
         tela e troca de monitor de uma vez. */
      const esperado = Math.round(Math.min(window.devicePixelRatio || 1, 2) * window.innerWidth);
      if (canvas.width !== esperado || ch !== window.innerHeight) layout();

      /* 1. deslocamento olhos→cursor. Duas medidas diferentes, e misturá-las
         era o outro erro: a DIREÇÃO tem de ser geométrica, em pixels, senão o
         olhar não aponta para o ponteiro; o RAIO, esse sim normalizado por
         eixo, serve só para a curva de resposta funcionar igual nos dois
         eixos apesar de a cabeça não estar no meio da altura. */
      const headX = cw * 0.5;
      const headY = ch * anchorY;
      const ddx = mx - headX;
      const ddy = my - headY;
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);
      const ux = ddx / (cw * 0.5);
      const uy = ddy / (ch * 0.5);
      const r = Math.sqrt(ux * ux + uy * uy);

      /* 2. curva central sobre esse raio: resposta cresce suave, sem degrau
         em ponto nenhum — o pé plano é o que impede o tremor. */
      const u = clamp01(
        (Math.min(1, r) - TRACKING.CENTER_INNER) /
          (TRACKING.CENTER_OUTER - TRACKING.CENTER_INNER),
      );
      const resposta = Math.pow(smoothstep(u), TRACKING.CENTER_CURVE);

      /* 3. inatividade e ponteiro fora da janela: esmaecem a influência ao
         longo do tempo, não de uma vez */
      const parado = now - lastMove - TRACKING.IDLE_START_MS;
      const idle = clamp01(parado / TRACKING.IDLE_FADE_MS);
      const influencia =
        hasPointer && pointerInside ? resposta * (1 - idle) : 0;

      /* 4. sensibilidade por eixo e teto de amplitude */
      if (dist > 0.5) {
        /* Direção pedida: geométrica, com o eixo Y podendo ser achatado por
           SENS_Y, e renormalizada para unitária — a escolha do quadro é só
           sobre DIREÇÃO. */
        let dxDes = (ddx / dist) * TRACKING.SENS_X;
        let dyDes = (ddy / dist) * TRACKING.SENS_Y;
        const nrm = Math.sqrt(dxDes * dxDes + dyDes * dyDes) || 1;
        dxDes /= nrm;
        dyDes /= nrm;
        pickAimed(dxDes, dyDes, now);
      }

      /* 5. REPOUSO VIVO. A faixa neutra mais próxima é escolhida uma vez e
         percorrida em vaivém no ritmo do próprio vídeo. É o que impede a
         imagem de virar uma foto quando ninguém mexe o mouse. */
      const banda = restBand(pos);
      if (restPos < banda.ini || restPos > banda.fim) {
        restPos = Math.min(banda.fim, Math.max(banda.ini, restPos));
      }
      restPos += restDir * TRACKING.REST_FPS * dt;
      if (restPos >= banda.fim) {
        restPos = banda.fim;
        restDir = -1;
      } else if (restPos <= banda.ini) {
        restPos = banda.ini;
        restDir = 1;
      }

      /* ALVO: mistura contínua entre o repouso e o quadro mirado. É a mesma
         engrenagem servindo a três requisitos — zona central, retorno ao
         neutro e inatividade — e por ser mistura, nunca snap. */
      const target = restPos + (aimedTarget - restPos) * influencia;

      /* 6. cascata com dt real. Perto do neutro o segundo estágio fica
         ainda mais lento: voltar a encarar é gesto sem pressa. */
      const kHead =
        TRACKING.SMOOTH_HEAD * influencia + TRACKING.RETURN_SMOOTH * (1 - influencia);
      const kAim = reduced ? 40 : TRACKING.SMOOTH_AIM;
      const kPos = reduced ? 40 : kHead;

      aim += (target - aim) * (1 - Math.exp(-dt * kAim));
      /* O passo é amortecido E limitado. O amortecimento dá a frenagem suave
         na chegada; o teto impede que a partida seja um rodopio. */
      const passo = (aim - pos) * (1 - Math.exp(-dt * kPos));
      const passoMax = TRACKING.MAX_TURN_FPS * dt;
      pos += Math.max(-passoMax, Math.min(passoMax, passo));

      /* 7. desenha TODO quadro de tela. Antes só desenhava quando o índice
         mudava, o que economizava trabalho e produzia imagem literalmente
         congelada entre trocas — 53% do tempo, medido em vídeo. Com a
         respiração no enquadramento, cada quadro de tela é diferente do
         anterior. Custa um `drawImage`, medido em menos de 1 ms. */
      const index = Math.max(0, Math.min(N_FRAMES - 1, Math.round(pos)));
      breathPhase += (dt * Math.PI * 2) / TRACKING.BREATH_PERIOD_S;
      draw(index, breathPhase);
      if (index !== drawn) {
        canvas.dataset.frame = String(index);
        drawn = index;
      }
      needsDraw = false;

      /* 8. barra: carregamento real, com piso de tempo */
      const loadFrac = settled >= N_FRAMES ? 1 : loaded / N_FRAMES;
      const timeFrac = (now - started) / MIN_LOAD_MS;
      const v = Math.min(loadFrac, Math.min(1, timeFrac));
      if (v > shown) {
        shown = v;
        const pct = Math.round(shown * 100);
        if (pct !== shownPct) {
          shownPct = pct;
          setProgresso(pct);
          if (pct >= 100) setPronto(true);
        }
      }
    }

    /* ── listeners: registrados UMA vez, removidos no unmount ─────── */
    const onMove = (e: PointerEvent | MouseEvent) => {
      const nx = e.clientX;
      const ny = e.clientY;
      /* Só conta como movimento se andou de verdade — tremor de trackpad
         não deve cancelar a inatividade. */
      if (
        !hasPointer ||
        Math.abs(nx - mx) + Math.abs(ny - my) >= TRACKING.MOVE_EPS_PX
      ) {
        lastMove = performance.now();
      }
      mx = nx;
      my = ny;
      hasPointer = true;
      pointerInside = true;
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) pointerInside = false;
    };
    const onBlur = () => {
      pointerInside = false;
    };
    const onFocus = () => {
      lastMove = performance.now();
    };
    const onResize = () => layout();

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    layout();
    mx = cw * 0.5;
    my = ch * anchorY;
    lastMove = started;
    pump();
    raf = window.requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      /* 240 quadros de 1920×1080 é memória demais para deixar pendurada num
         componente que já saiu da tela. */
      for (const img of pending) {
        img.onload = null;
        img.onerror = null;
      }
      pending.clear();
      frames.fill(null);
    };
  }, []);

  /* ── JSX ────────────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "fixed inset-0 z-[2147483000] flex flex-col items-center justify-center overflow-hidden bg-[#16323e]",
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="BLINK, o assistente do Gestor de Automações, acompanha o cursor com o olhar enquanto o sistema carrega."
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0, transition: "opacity .5s ease" }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 30%, rgba(5, 20, 28, 0.65) 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%]"
        style={{
          background:
            "linear-gradient(to top, rgba(5, 20, 28, 0.95) 0%, rgba(5, 20, 28, 0.75) 30%, transparent 100%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-8 z-10 flex w-full flex-col items-center gap-5 text-center px-6">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-[20px] font-bold leading-tight text-white/90 sm:text-[24px]">
            Bem-vindo ao<br/>
            <span className="text-[#FFDA5B]">Gestor de Automações</span>
          </h1>
        </div>

        <p className="text-[13px] leading-relaxed text-white/70 shadow-sm max-w-[280px]">
          Estamos preparando tudo. O BLINK fica de olho em você enquanto isso.
        </p>

        <div className="w-full max-w-[280px] space-y-3">
          <div
            className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/10 shadow-[0_1px_10px_rgba(5,20,28,0.5)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progresso)}
            aria-label="Progresso do carregamento"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progresso}%`,
                background: pronto ? "#7ef2b0" : "#FFDA5B",
                boxShadow: pronto ? "0 0 12px rgba(126, 242, 176, 0.4)" : "0 0 12px rgba(255, 218, 91, 0.4)",
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[12px] text-white/60 font-medium tracking-wide">
            <span aria-live="polite">{pronto ? "Pronto" : (estado ?? "Carregando...")}</span>
            <span>{Math.round(progresso)}%</span>
          </div>
        </div>

        <div className="h-14 mt-2 flex items-center justify-center">
          {pronto && onEnter && (
            <button
              onClick={enter}
              className="rounded-full bg-[#FFDA5B] px-8 py-3 text-[14px] font-bold text-[#12242c] shadow-[0_8px_26px_rgba(255,216,61,0.26)] transition-all hover:-translate-y-[1px] hover:bg-[#ffe469] hover:shadow-[0_12px_30px_rgba(255,216,61,0.34)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFDA5B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16323e]"
              autoFocus
            >
              Entrar no sistema
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
