import { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * A TELA DE ENTRADA DO SISTEMA — com o Blink 3D em vídeo.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SISTEMA DE RASTREAMENTO DO CURSOR — SPRING-DAMPER + GAZE MAP
 * ═══════════════════════════════════════════════════════════════════════
 *
 * O BLINK acompanha o ponteiro do mouse com inércia, peso e intenção.
 *
 * O vídeo `BLINK4K.mp4` contém 240 quadros (10 segundos a 24fps) onde o
 * BLINK olha para várias direções. Usamos a mesma tabela de mapeamento
 * (GAZE_KEYS) do antigo `BlinkLoader`, mas em vez de baixar 240 imagens,
 * controlamos o `currentTime` de um único MP4 de altíssima qualidade.
 *
 * PIPELINE
 *
 *   MOUSE (evento bruto)
 *     → calcula distância do centro (para dead zone e inatividade)
 *     → avalia todos os quadros possíveis do vídeo
 *     → pontua os quadros por alinhamento direcional e proximidade na timeline
 *     → aplica histerese (só troca de alvo se o novo for muito melhor)
 *     → define o TARGET FRAME
 *
 *   ANIMAÇÃO (requestAnimationFrame)
 *     → calcula delta time real (frame-rate independent)
 *     → blend de inatividade (se o mouse sumir, alvo vira quadro neutro)
 *     → atualiza spring-damper (posição e velocidade)
 *     → aplica o frame atual (posição da mola) ao `currentTime` do vídeo
 *
 * FÍSICA E INÉRCIA (SPRING-DAMPER)
 *
 *   F = ω²·(target - pos) - 2ζω·vel
 *   O sistema tem POSIÇÃO e VELOCIDADE. Se o alvo pula do frame 10
 *   para o frame 200, a mola acelera a velocidade e "arrasta" o vídeo
 *   pelos frames intermediários (criando o movimento da cabeça virando).
 *   Ao passar do centro, a velocidade desacelera organicamente.
 */

// ═══════════════════════════════════════════════════════════════════════
// DADOS DE RASTREAMENTO (GAZE MAP)
// ═══════════════════════════════════════════════════════════════════════

const N_FRAMES = 240;

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
const NEUTRAL_MAG = 0.3;
const NEUTRAL_FRAMES: number[] = [];
const AIMED_FRAMES: number[] = [];
for (let f = 0; f < N_FRAMES; f++) {
  (GAZE[f].mag < NEUTRAL_MAG ? NEUTRAL_FRAMES : AIMED_FRAMES).push(f);
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

// ═══════════════════════════════════════════════════════════════════════
// PARÂMETROS DE RASTREAMENTO
// ═══════════════════════════════════════════════════════════════════════

const TRACKING = {
  // ── Física ────────────────────────────────────────────────────────
  SPRING_FREQUENCY: 3.5,     // ω: quão rápido ele acompanha o target
  DAMPING_RATIO: 1.0,        // ζ: 1.0 = crítico (sem oscilar no final)
  
  // ── Escolha de alvos ──────────────────────────────────────────────
  NEAR_PX: 30,               // Se o mouse estiver muito perto, encara
  IDLE_MS: 5000,
  SWITCH_MARGIN: 0.08,
  SWITCH_COOLDOWN_MS: 160,
  TIMELINE_PENALTY: 0.0015,
  
  // ── Zona Central (Dead zone suave) ────────────────────────────────
  DEAD_ZONE_RADIUS: 0.05,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════

export const BoasVindas = memo(function BoasVindas({
  estado,
  className,
  onEnter,
}: {
  estado?: string;
  className?: string;
  onEnter?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [pronto, setPronto] = useState(false);

  // ── Estado do Botão / Entrada ──
  const enter = useCallback(() => {
    if (onEnter) onEnter();
  }, [onEnter]);

  /* ── Estado mutável do tracking (refs, sem re-render) ───────────── */
  const tracking = useRef({
    // Mouse bruto
    mx: window.innerWidth * 0.5,
    my: window.innerHeight * 0.36,
    hasPointer: false,
    pointerInside: true,
    lastMove: 0,
    lastSwitch: 0,
    
    // Alvo atual
    targetFrame: 0,
    targetScore: -Infinity,

    // Física
    currentFrame: 0,
    velocityFrame: 0,

    lastFrameTime: 0,
    duration: 10,
    rafId: 0,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const s = tracking.current;
    
    // Inicialização da posição âncora
    s.mx = window.innerWidth * 0.5;
    s.my = window.innerHeight * 0.36;
    s.lastMove = performance.now();

    const onLoaded = () => {
      s.duration = video.duration || 10;
      s.currentFrame = nearestNeutral(0);
      s.targetFrame = s.currentFrame;
      video.currentTime = (s.currentFrame / N_FRAMES) * s.duration;
      
      // Tentativa de destrave imediato
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.then(() => video.pause()).catch(() => video.pause());
      } else {
        video.pause();
      }
    };
    video.addEventListener("loadeddata", onLoaded);
    if (video.readyState >= 2) onLoaded();

    // Destrave absoluto: garante que ao primeiro toque/clique na tela o vídeo seja destravado
    const unlockMedia = () => {
      video.play().then(() => video.pause()).catch(() => {});
      document.removeEventListener("pointerdown", unlockMedia);
      document.removeEventListener("keydown", unlockMedia);
    };
    document.addEventListener("pointerdown", unlockMedia, { once: true });
    document.addEventListener("keydown", unlockMedia, { once: true });

    // ── Mouse Handlers ──
    const onMove = (e: MouseEvent | PointerEvent) => {
      s.mx = e.clientX;
      s.my = e.clientY;
      s.hasPointer = true;
      s.pointerInside = true;
      s.lastMove = performance.now();
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) s.pointerInside = false;
    };
    const onBlur = () => { s.pointerInside = false; };
    const onFocus = () => { s.lastMove = performance.now(); };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // ── Lógica de Escolha de Alvo ──
    function pickTarget(now: number) {
      const cw = window.innerWidth;
      const ch = window.innerHeight;
      
      const headX = cw * 0.5;
      const headY = ch * 0.36; // Posição aproximada da cabeça na tela
      
      const dx = s.mx - headX;
      const dy = s.my - headY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Dead zone normalizado
      const normDist = dist / Math.min(cw, ch);

      // Se inativo, fora da tela, perto demais do centro, ou dentro do dead zone -> olha neutro
      const encara = 
        !s.hasPointer || 
        !s.pointerInside || 
        dist < TRACKING.NEAR_PX || 
        normDist < TRACKING.DEAD_ZONE_RADIUS ||
        now - s.lastMove > TRACKING.IDLE_MS;

      if (encara) {
        const wanted = nearestNeutral(s.currentFrame);
        if (wanted !== s.targetFrame && now - s.lastSwitch >= TRACKING.SWITCH_COOLDOWN_MS) {
          s.targetFrame = wanted;
          s.targetScore = -Infinity;
          s.lastSwitch = now;
        }
        return;
      }

      // Direção normalizada desejada
      const nx = dx / dist;
      const ny = dy / dist;

      let best = -Infinity;
      let bestF = s.targetFrame;
      let currentScore = -Infinity;

      for (const f of AIMED_FRAMES) {
        const g = GAZE[f];
        // Score: alinhamento vetorial - penalidade de distância temporal
        const score = (nx * g.x + ny * g.y) - (Math.abs(f - s.currentFrame) * TRACKING.TIMELINE_PENALTY);
        
        if (f === s.targetFrame) currentScore = score;
        if (score > best) {
          best = score;
          bestF = f;
        }
      }

      if (bestF === s.targetFrame) {
        s.targetScore = currentScore;
        return;
      }
      
      if (now - s.lastSwitch < TRACKING.SWITCH_COOLDOWN_MS) return;
      const reference = currentScore > -Infinity ? currentScore : s.targetScore;
      
      // Histerese: só troca se o novo quadro for sensivelmente melhor
      if (best <= reference + TRACKING.SWITCH_MARGIN) return;

      s.targetFrame = bestF;
      s.targetScore = best;
      s.lastSwitch = now;
    }

    // ── Loop de Animação ──
    const tick = () => {
      s.rafId = requestAnimationFrame(tick);
      const vid = videoRef.current;
      if (!vid || !s.duration) return;

      const now = performance.now();
      const dt = s.lastFrameTime
        ? Math.min((now - s.lastFrameTime) / 1000, 0.1)
        : 1 / 60;
      s.lastFrameTime = now;

      pickTarget(now);

      // FÍSICA: Suavização Exponencial com correção de tempo (time-corrected lerp)
      // Evita o overshoot da mola e reduz o stress do decodificador de vídeo,
      // resolvendo os movimentos "estranhos" ou glitchy durante o scrub de MP4.
      const smoothing = 4.0; // Velocidade da transição (menor = mais inércia)
      const factor = 1 - Math.exp(-dt * smoothing);
      
      s.currentFrame += (s.targetFrame - s.currentFrame) * factor;

      // Clamp para manter nos limites do vídeo
      const clampedFrame = Math.max(0, Math.min(N_FRAMES - 1, s.currentFrame));
      
      // Converte frame (0..240) para tempo (0..duration)
      const targetTime = (clampedFrame / N_FRAMES) * s.duration;

      // Só faz seek se houver mudança perceptível e o vídeo estiver pronto
      if (vid.readyState >= 2 && Math.abs(vid.currentTime - targetTime) > 0.005) {
        try {
          vid.currentTime = targetTime;
        } catch (e) {
          // Ignora erros de seek no boot
        }
      }
    };

    s.rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(s.rafId);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, []);

  /* ── Barra de progresso ─────────────────────────────────────────── */
  useEffect(() => {
    if (progresso >= 100) {
      if (!pronto) setPronto(true);
      return;
    }
    const timer = setTimeout(() => {
      setProgresso((p) => Math.min(p + (1 + Math.random() * 3), 100));
    }, 60 + Math.random() * 140);
    return () => clearTimeout(timer);
  }, [progresso, pronto]);

  /* ── JSX ────────────────────────────────────────────────────────── */
  return (
    <div
      className={cn(
        "fixed inset-0 z-[2147483000] flex flex-col items-center justify-center overflow-hidden bg-[#16323e]",
        className,
      )}
    >
      <video
        ref={videoRef}
        src="/blink4k.mp4"
        muted
        playsInline
        autoPlay
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 40%", willChange: "transform" }}
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
          <div className="relative h-[5px] w-full overflow-hidden rounded-full bg-white/10 shadow-[0_1px_10px_rgba(5,20,28,0.5)]">
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
            <span>{pronto ? "Pronto" : (estado ?? "Carregando...")}</span>
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
