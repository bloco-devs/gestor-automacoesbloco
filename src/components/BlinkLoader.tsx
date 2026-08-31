import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * BLINK DE BOOT — a tela de abertura do Gestor de Automações.
 *
 * O carregamento deixa de ser uma barra num fundo vazio: o BLINK ocupa a tela
 * inteira e acompanha o cursor com o olhar enquanto o sistema sobe. O truque é
 * que não existe rig, nem 3D, nem olho desenhado em runtime — existe um vídeo
 * de 240 quadros em que ele já olha para todo lado, e uma tabela dizendo para
 * onde ele olha em cada quadro. Rastrear o mouse é, portanto, um problema de
 * BUSCA: qual quadro deste vídeo olha mais parecido com a direção do cursor?
 *
 * POR QUE ISSO PARECE VIVO E UM SPRITE DE OLHO NÃO PARECERIA
 *
 * Porque não pulamos para o quadro vencedor. `pos` é fracionário e persegue o
 * alvo com amortecimento exponencial, então os quadros do meio passam na tela —
 * e nesses quadros o vídeo traz de graça o que ninguém programaria: a cabeça
 * girando junto, a antena atrasando, a piscada no caminho. Teleporte mataria
 * exatamente isso.
 *
 * SEM DEPENDÊNCIA E SEM TAILWIND
 *
 * Estilos próprios, todos com prefixo `bl-`, injetados aqui mesmo. Esta tela
 * roda antes de qualquer coisa do app; se ela dependesse do CSS do projeto,
 * dependeria da ordem de carregamento — e é justamente a ordem de carregamento
 * que ela existe para esconder.
 */

/* ------------------------------------------------------------- o vídeo e o olhar */

const IW = 1280;
const IH = 720;
const N_FRAMES = 240;

/** Onde a cabeça está dentro do quadro, em fração da imagem. */
const HEAD = { x: 0.52, y: 0.356 };

/**
 * Quadros-chave medidos no vídeo: `[quadro, x, y]`.
 *
 * `x` positivo é direita, `y` positivo é baixo, e o módulo é intensidade —
 * `1` é olhar no extremo. Medido de 6 em 6 quadros; entre eles interpolamos
 * reto, o que basta porque o olhar do vídeo não muda de direção mais rápido
 * que isso.
 */
const GAZE_KEYS: ReadonlyArray<readonly [number, number, number]> = [
  [0, -0.01, -0.01], [6, 0, -0.01], [12, -0.01, 0], [18, 0.01, 0.01], [24, 0.01, 0.08],
  [30, -0.29, 0.13], [36, -0.67, 0.19], [42, -0.84, 0.13], [48, -0.84, 0.07], [54, -0.76, 0.05],
  [60, -0.78, 0.07], [66, -0.8, 0.1], [72, -0.8, 0.12], [78, -0.88, 0.05], [84, -0.15, -0.49],
  [90, 0.83, -0.4], [96, 0.9, -0.23], [102, 0.78, -0.55], [108, 0.44, -0.76], [114, -0.06, -0.8],
  [120, -0.41, -0.87], [126, -0.3, -0.75], [132, 0.09, -0.61], [138, 0.45, -0.33], [144, 0.85, 0.14],
  [150, 1, 0.57], [156, 0.95, 0.77], [162, 0.94, 0.85], [168, 0.88, 0.92], [174, 0.67, 0.99],
  [180, 0.49, 0.97], [186, 0.33, 0.78], [192, 0.14, 0.58], [198, -0.03, 0.47], [204, -0.1, 0.26],
  [210, -0.18, 0.48], [216, -0.12, 0.38], [222, 0.03, 0.14], [228, 0.06, -0.03], [234, 0.07, -0.12],
  [239, 0.09, -0.13],
];

type Gaze = { x: number; y: number; mag: number };

/** Interpola os 41 quadros-chave para os 240 quadros do vídeo. */
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

/** Abaixo desta intensidade o BLINK está olhando para a câmera, não para um lado. */
const NEUTRAL_MAG = 0.3;
const NEUTRAL_FRAMES: number[] = [];
const AIMED_FRAMES: number[] = [];
for (let f = 0; f < N_FRAMES; f++) {
  (GAZE[f].mag < NEUTRAL_MAG ? NEUTRAL_FRAMES : AIMED_FRAMES).push(f);
}

/* ------------------------------------------------------------------ o rastreio */

/** Perto demais para "olhar na direção": ele encara de volta. */
const NEAR_PX = 130;
/** Mouse quieto por este tempo: ele volta a encarar a câmera. */
const IDLE_MS = 7000;
/** O novo alvo precisa ganhar por esta margem — senão o olhar tremeria. */
const SWITCH_MARGIN = 0.08;
/** E não mais de uma troca neste intervalo. */
const SWITCH_COOLDOWN_MS = 160;
/**
 * Preço de atravessar a linha do tempo. Sem ele, um olhar 2% melhor do outro
 * lado do vídeo justifica um passeio de 150 quadros; com ele, a reação fica
 * curta e vizinha, que é como cabeça de verdade se comporta.
 */
const TIMELINE_PENALTY = 0.0008;
/** `dt` travado: a animação é do olhar, não do relógio da máquina. */
const DT = 0.05;
const DAMPING = 8.5;
/** Com `prefers-reduced-motion`, o mesmo motor — só sem o passeio. */
const DAMPING_REDUCED = 30;
/** Menos de meio quadro de distância não vale mais interpolação. */
const SNAP = 0.5;

/* ------------------------------------------------------------- o pré-carregamento */

/**
 * Passadas de densidade crescente. A primeira traz 10 quadros espalhados pelos
 * 10 segundos, então o BLINK já responde ao mouse antes do segundo quadro de
 * cada trecho existir — grosso, mas vivo. As passadas seguintes preenchem o
 * meio, e a fluidez chega junto com o resto do boot.
 */
const PASSES = [24, 12, 6, 3, 1] as const;
const CONCURRENCY = 8;
/** Com este tanto na memória a cena já vale ser mostrada. */
const SHOW_AT = 12;

const BAR_YELLOW = "#ffd83d";
const BAR_GREEN = "#7ef2b0";

const DEFAULT_MESSAGES: Array<[number, string]> = [
  [0, "Acordando o BLINK…"],
  [0.22, "Verificando sua sessão…"],
  [0.48, "Carregando seus módulos…"],
  [0.74, "Organizando suas demandas…"],
  [0.92, "Últimos ajustes…"],
];

export type BlinkLoaderProps = {
  /** URL base dos quadros, sem barra final. */
  baseUrl: string;
  onEnter: () => void;
  /** Progresso real 0..1. Ausente, a barra é simulada por tempo. */
  progress?: number;
  /** Boot concluído. É o que autoriza a barra a fechar em 100%. */
  ready?: boolean;
  minLoadMs?: number;
  autoEnter?: boolean;
  autoEnterDelayMs?: number;
  title?: ReactNode;
  hint?: string;
  messages?: Array<[number, string]>;
};

/* ----------------------------------------------------------------------- estilos */

const CSS = `
.bl-root{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:#16323e;
  color:#eaf4f8;opacity:0;transition:opacity .5s ease;
  font-family:Manrope,"Nunito Sans","Segoe UI",system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased}
.bl-root[data-visible="true"]{opacity:1}
.bl-canvas{position:absolute;inset:0;display:block;width:100%;height:100%}
.bl-scrim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(to top,
  rgba(5,20,28,.95) 0%,rgba(5,20,28,.88) 18%,rgba(5,20,28,.58) 36%,rgba(5,20,28,.18) 52%,rgba(5,20,28,0) 66%)}
.bl-panel{position:absolute;left:50%;bottom:clamp(26px,6.5vh,74px);transform:translateX(-50%);
  width:min(560px,calc(100% - 36px));text-align:center}
.bl-title{margin:0 0 8px;font-family:Nunito,Manrope,system-ui,sans-serif;font-weight:700;
  font-size:clamp(20px,3.4vw,32px);line-height:1.16;letter-spacing:-.01em;
  text-shadow:0 2px 18px rgba(5,20,28,.75)}
.bl-title-strong{display:block;color:${BAR_YELLOW};font-weight:800}
.bl-hint{margin:0 0 20px;font-size:clamp(12.5px,1.5vw,15px);line-height:1.45;
  color:rgba(234,244,248,.74);text-shadow:0 1px 12px rgba(5,20,28,.8)}
.bl-bar{position:relative;height:6px;border-radius:999px;overflow:hidden;
  background:rgba(234,244,248,.16);box-shadow:0 1px 10px rgba(5,20,28,.5)}
.bl-fill{height:100%;width:0%;border-radius:999px;background:${BAR_YELLOW};
  transition:width .3s linear,background-color .45s ease}
.bl-meta{display:flex;align-items:baseline;justify-content:space-between;gap:14px;
  margin-top:10px;font-size:12.5px;font-variant-numeric:tabular-nums;
  color:rgba(234,244,248,.66);text-shadow:0 1px 10px rgba(5,20,28,.8)}
.bl-msg{text-align:left}
.bl-pct{text-align:right}
.bl-actions{min-height:52px;margin-top:16px;display:flex;justify-content:center;align-items:center}
.bl-enter{appearance:none;border:0;cursor:pointer;border-radius:999px;
  padding:11px 26px;font-family:inherit;font-size:14.5px;font-weight:700;
  color:#12242c;background:${BAR_YELLOW};
  box-shadow:0 8px 26px rgba(255,216,61,.26);
  transition:transform .18s ease,box-shadow .18s ease,background-color .18s ease}
.bl-enter:hover{background:#ffe469;transform:translateY(-1px);box-shadow:0 12px 30px rgba(255,216,61,.34)}
.bl-enter:active{transform:translateY(0)}
.bl-enter:focus-visible{outline:3px solid ${BAR_YELLOW};outline-offset:3px}
@media (max-width:560px){.bl-panel{bottom:clamp(20px,4vh,40px)}.bl-hint{margin-bottom:16px}}
@media (prefers-reduced-motion:reduce){
  .bl-root,.bl-fill,.bl-enter{transition:none!important}
}
`;

/* ------------------------------------------------------------------ o componente */

export function BlinkLoader({
  baseUrl,
  onEnter,
  progress,
  ready,
  minLoadMs = 6000,
  autoEnter = false,
  autoEnterDelayMs = 900,
  title,
  hint = "Estamos preparando tudo. O BLINK fica de olho em você enquanto isso.",
  messages = DEFAULT_MESSAGES,
}: BlinkLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const pctRef = useRef<HTMLSpanElement | null>(null);
  const msgRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);

  /**
   * `progress`/`ready` mudam por render; o laço de animação não pode fechar em
   * cima do valor de uma render antiga, então lê sempre do ref.
   */
  const progressRef = useRef<number | undefined>(progress);
  const readyRef = useRef<boolean | undefined>(ready);
  progressRef.current = progress;
  readyRef.current = ready;

  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  /**
   * `messages` costuma chegar como literal no JSX do chamador — array novo a
   * cada render. Se entrasse nas dependências do efeito, cada render remontaria
   * o motor e recomeçaria o download dos quadros.
   */
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const enter = useCallback(() => {
    onEnterRef.current();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const base = baseUrl.replace(/\/+$/, "");
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const damping = reduced ? DAMPING_REDUCED : DAMPING;
    const step = 1 - Math.exp(-DT * damping);

    let alive = true;
    let raf = 0;

    /* ---------------------------------------------------- quadros na memória */

    const frames: Array<HTMLImageElement | null> = new Array(N_FRAMES).fill(null);
    /** Carregado ou 404: em qualquer dos dois casos a barra não deve mais esperar. */
    let settled = 0;
    let loaded = 0;
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
          /* Base de quadros errada não pode virar tela preta com o botão
             escondido atrás dela: depois de uma passada inteira sem nenhum
             acerto, mostramos o painel de qualquer jeito. */
          if (!ok && loaded === 0 && settled >= 24) setVisible(true);
          if (ok) {
            frames[index] = img;
            loaded += 1;
            if (loaded >= SHOW_AT) setVisible(true);
            if (loaded <= SHOW_AT) needsDraw = true;
          }
          pump();
        };
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        img.src = `${base}/f${String(index + 1).padStart(3, "0")}.webp`;
      }
    }

    /** O quadro carregado mais próximo do que queríamos desenhar. */
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

    /* --------------------------------------------------------------- o layout */

    let dpr = 1;
    let cw = 0;
    let ch = 0;
    /** Onde a cabeça dele cai na tela, em fração da altura. */
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
      /* Em tela estreita o painel de texto come o rodapé, então a cabeça sobe
         para não ficar atrás da barra de progresso. */
      anchorY = cw <= 560 ? 0.28 : cw <= 900 ? 0.32 : 0.36;
      needsDraw = true;
    }

    function draw(index: number) {
      const img = nearestLoaded(index);
      ctx.fillStyle = "#16323e";
      ctx.fillRect(0, 0, cw, ch);
      if (!img) return;

      /* Cover, com um teto: em tela alta e estreita o cover puro amplia o
         personagem até virar textura. O teto é relativo à escala horizontal,
         então nunca sobra faixa lateral. */
      const sx = cw / IW;
      const cap = cw <= 560 ? 2.3 : 1.9;
      const scale = Math.min(Math.max(sx, ch / IH), sx * cap);
      const dw = IW * scale;
      const dh = IH * scale;

      /* A âncora manda no enquadramento; o clamp só entra se ela pediria uma
         faixa vazia na lateral. Desloca no máximo 2% da largura. */
      let dx = cw * 0.5 - HEAD.x * dw;
      dx = Math.min(0, Math.max(cw - dw, dx));
      const dy = ch * anchorY - HEAD.y * dh;

      ctx.drawImage(img, dx, dy, dw, dh);

      /* Falta céu em cima: estica a primeira linha do quadro para cima. É a
         cor exata do fundo do vídeo, então a emenda não aparece. */
      if (dy > 0) {
        ctx.drawImage(img, 0, 0, IW, 1, dx, 0, dw, Math.ceil(dy) + 1);
      }
      /*
       * Falta chão embaixo. Em 390×844 isso é um terço da tela — o teto de zoom
       * impede o cover, e impede com razão: cobrir exigiria 3,8× a escala
       * horizontal e a cabeça viraria textura.
       *
       * O degradê sozinho deixava uma linha reta atravessando a tela, porque
       * `#5f7f8b` não é a cor com que o quadro termina. Então a mesma solução do
       * topo entra primeiro: a última linha do quadro esticada para baixo, que
       * é a cor EXATA da emenda e a faz desaparecer. O degradê vem por cima,
       * começando transparente e fechando no fundo da página — o piso recua para
       * a sombra em vez de acabar num corte.
       */
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

    /* --------------------------------------------------------------- o cursor */

    let mx = 0;
    let my = 0;
    let hasPointer = false;
    let lastMove = 0;
    let pointerInside = true;

    let pos = 0;
    let target = 0;
    let targetScore = -Infinity;
    let lastSwitch = 0;

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

    function pickTarget(now: number) {
      const headX = cw * 0.5;
      const headY = ch * anchorY;
      const dx = mx - headX;
      const dy = my - headY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const encara =
        !hasPointer ||
        !pointerInside ||
        dist < NEAR_PX ||
        now - lastMove > IDLE_MS;

      if (encara) {
        const wanted = nearestNeutral(pos);
        if (wanted !== target && now - lastSwitch >= SWITCH_COOLDOWN_MS) {
          target = wanted;
          /* `-Infinity` e não `Infinity`: o quadro neutro não está em
             `AIMED_FRAMES`, então na próxima mexida do mouse ele não teria
             pontuação para comparar — com o teto aqui, o olhar ficaria preso
             encarando a câmera para sempre. */
          targetScore = -Infinity;
          lastSwitch = now;
        }
        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;

      /* Produto escalar com o vetor BRUTO do quadro, não normalizado: assim um
         olhar intenso na direção certa ganha de um olhar tímido na mesma
         direção — que é o que faz o rastreio parecer proporcional. */
      let best = -Infinity;
      let bestF = target;
      let currentScore = -Infinity;
      for (const f of AIMED_FRAMES) {
        const g = GAZE[f];
        const s = nx * g.x + ny * g.y - Math.abs(f - pos) * TIMELINE_PENALTY;
        if (f === target) currentScore = s;
        if (s > best) {
          best = s;
          bestF = f;
        }
      }

      if (bestF === target) {
        targetScore = currentScore;
        return;
      }
      if (now - lastSwitch < SWITCH_COOLDOWN_MS) return;
      const reference = currentScore > -Infinity ? currentScore : targetScore;
      if (best <= reference + SWITCH_MARGIN) return;

      target = bestF;
      targetScore = best;
      lastSwitch = now;
    }

    /* ------------------------------------------------------------- a barra */

    const started = typeof performance !== "undefined" ? performance.now() : 0;
    let shown = 0;
    let lastPctText = "";
    let lastMsgText = "";
    let complete = false;

    function updateBar(now: number) {
      const loadFrac = settled >= N_FRAMES ? 1 : loaded / N_FRAMES;
      const p = progressRef.current;
      let value: number;
      if (typeof p === "number") {
        value = Math.min(loadFrac, Math.max(0, Math.min(1, p)));
        /* Só o boot pode fechar a barra. Sem `ready`, ela para na soleira. */
        if (!readyRef.current) value = Math.min(value, 0.99);
        else value = 1;
      } else {
        const timeFrac = minLoadMs > 0 ? (now - started) / minLoadMs : 1;
        value = Math.min(loadFrac, Math.min(1, timeFrac));
      }

      /* Nunca retrocede: barra que volta parece defeito, não informação. */
      if (value > shown) shown = value;

      const pct = Math.round(shown * 100);
      const pctText = `${pct}%`;
      const finished = shown >= 1;

      if (pctRef.current && pctText !== lastPctText) {
        pctRef.current.textContent = pctText;
        lastPctText = pctText;
      }
      if (fillRef.current) fillRef.current.style.width = `${shown * 100}%`;
      if (barRef.current) barRef.current.setAttribute("aria-valuenow", String(pct));

      let msg = "Carregando…";
      if (finished) {
        msg = "Pronto";
      } else {
        for (const [at, text] of messagesRef.current) {
          if (shown >= at) msg = text;
        }
      }
      if (msgRef.current && msg !== lastMsgText) {
        msgRef.current.textContent = msg;
        lastMsgText = msg;
      }

      if (finished && !complete) {
        complete = true;
        if (fillRef.current) fillRef.current.style.background = BAR_GREEN;
        setDone(true);
      }
    }

    /* --------------------------------------------------------------- o laço */

    function tick() {
      if (!alive) return;
      raf = window.requestAnimationFrame(tick);
      const now = performance.now();

      /* Aba oculta na montagem entrega `innerWidth` de mentira, e o canvas
         nasce do tamanho errado. Conferir por quadro é barato e cobre isso,
         rotação de tela e mudança de monitor de uma vez. */
      const expected = Math.round(Math.min(window.devicePixelRatio || 1, 2) * window.innerWidth);
      if (canvas.width !== expected || ch !== window.innerHeight) layout();

      pickTarget(now);

      const delta = target - pos;
      if (Math.abs(delta) < SNAP) pos = target;
      else pos += delta * step;

      const index = Math.max(0, Math.min(N_FRAMES - 1, Math.round(pos)));
      if (index !== drawn || needsDraw) {
        draw(index);
        drawn = index;
        needsDraw = false;
        /* Qual quadro está na tela é a única saída observável deste motor: o
           canvas é opaco para teste e para depuração. Uma troca de atributo por
           troca de quadro não pesa, e sem ela não há como afirmar que o olhar
           seguiu o cursor — só achar que seguiu. */
        canvas.dataset.frame = String(index);
      }

      updateBar(now);
    }

    /* ------------------------------------------------------------ escutadores */

    const onMove = (e: PointerEvent | MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      hasPointer = true;
      pointerInside = true;
      lastMove = performance.now();
    };
    const onOut = (e: MouseEvent) => {
      /* `relatedTarget` nulo é ponteiro saindo da janela, não trocando de
         elemento lá dentro. */
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
    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    layout();
    mx = cw * 0.5;
    my = ch * anchorY;
    lastMove = performance.now();
    pump();
    raf = window.requestAnimationFrame(tick);

    return () => {
      alive = false;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      /* 240 quadros de 1280×720 é memória demais para deixar pendurada num
         componente que já saiu da tela. */
      for (const img of pending) {
        img.onload = null;
        img.onerror = null;
      }
      pending.clear();
      frames.fill(null);
    };
  }, [baseUrl, minLoadMs]);

  /* O `autoEnter` espera um instante depois do "Pronto" — entrar no mesmo
     quadro em que a barra fecha parece corte, não transição. */
  useEffect(() => {
    if (!done || !autoEnter) return;
    const t = window.setTimeout(enter, autoEnterDelayMs);
    return () => window.clearTimeout(t);
  }, [done, autoEnter, autoEnterDelayMs, enter]);

  return (
    <div className="bl-root" data-visible={visible ? "true" : "false"}>
      <style>{CSS}</style>
      <canvas
        ref={canvasRef}
        className="bl-canvas"
        role="img"
        aria-label="BLINK, o assistente do Gestor de Automações, acompanha o cursor com o olhar enquanto o sistema carrega."
      />
      <div className="bl-scrim" />
      <div className="bl-panel">
        <h1 className="bl-title">
          {title ?? (
            <>
              Bem-vindo ao
              <strong className="bl-title-strong">Gestor de Automações</strong>
            </>
          )}
        </h1>
        <p className="bl-hint">{hint}</p>
        <div
          ref={barRef}
          className="bl-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-label="Progresso do carregamento"
        >
          <div ref={fillRef} className="bl-fill" />
        </div>
        <div className="bl-meta">
          <span ref={msgRef} className="bl-msg" aria-live="polite">
            Carregando…
          </span>
          <span ref={pctRef} className="bl-pct">
            0%
          </span>
        </div>
        <div className="bl-actions">
          {done && !autoEnter ? (
            <button type="button" className="bl-enter" onClick={enter} autoFocus>
              Entrar no sistema
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default BlinkLoader;
