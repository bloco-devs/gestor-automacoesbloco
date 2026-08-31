import { memo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

/**
 * A TELA DE ENTRADA DO SISTEMA — com o Blink 3D em vídeo.
 *
 * COMO O BLINK ACOMPANHA O PONTEIRO
 *
 * O vídeo BLINK4K.mp4 mostra o robô olhando em diferentes direções ao longo
 * dos seus 10 segundos. Em vez de rodar em autoplay, o componente mapeia a
 * posição X do cursor do mouse para um ponto na timeline do vídeo:
 *
 *   cursor na esquerda  → início do vídeo (Blink olha à esquerda)
 *   cursor no centro    → meio do vídeo (Blink olha para frente)
 *   cursor na direita   → final do vídeo (Blink olha à direita)
 *
 * Para que o movimento seja suave e lento, não aplico a posição diretamente.
 * Um loop de `requestAnimationFrame` interpola (lerp) entre o tempo atual e
 * o tempo-alvo com fator 0.04 — ou seja, a cada frame o vídeo avança apenas
 * 4% da distância restante. Isso cria aquele efeito de "seguir com atraso"
 * que faz o giro de cabeça parecer natural, não robótico.
 *
 * FALLBACK SEM MOUSE (mobile / touch)
 * Em dispositivos sem mouse, um oscilador senoidal percorre o vídeo lentamente
 * de um lado ao outro, criando um idle loop suave.
 *
 * CAMADAS (do fundo para a frente):
 *   1. Vídeo do Blink, pausado, com currentTime controlado por scrubbing.
 *   2. Vinheta radial que escurece as bordas.
 *   3. Gradiente inferior para legibilidade do texto.
 *   4. Overlay de texto com título, subtítulo e barra de progresso.
 *
 * ACESSIBILIDADE: o vídeo é puramente decorativo (aria-hidden, sem áudio
 * ativo). O conteúdo textual permanece acessível via role="status".
 */

/**
 * Fator de interpolação (lerp) por frame.
 * Quanto menor, mais lento e suave o acompanhamento.
 *   0.02 = muito lento, leva ~2s para chegar
 *   0.04 = suave, leva ~1s (padrão)
 *   0.08 = mais responsivo
 */
const LERP_FACTOR = 0.04;

/** Velocidade do idle (ciclo senoidal em segundos, para quando não há mouse). */
const IDLE_CYCLE_SECONDS = 12;

export const BoasVindas = memo(function BoasVindas({
  estado,
  className,
}: {
  /** O que está acontecendo agora. Uma linha, sem ponto final. */
  estado?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progresso, setProgresso] = useState(0);

  /* ── Refs mutáveis para o animation loop (não causa re-render) ────── */
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const hasMouseRef = useRef(false);
  const rafIdRef = useRef(0);
  const durationRef = useRef(10); // fallback até o vídeo carregar

  /* ── Mouse tracking ──────────────────────────────────────────────── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    hasMouseRef.current = true;
    const ratio = e.clientX / window.innerWidth; // 0 (esquerda) → 1 (direita)
    targetTimeRef.current = ratio * durationRef.current;
  }, []);

  /* ── Animation loop: lerp suave entre currentTime e targetTime ───── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoaded = () => {
      durationRef.current = v.duration || 10;
      // Começa no meio do vídeo (Blink olhando para frente)
      const mid = durationRef.current / 2;
      v.currentTime = mid;
      currentTimeRef.current = mid;
      targetTimeRef.current = mid;
      v.pause();
    };

    v.addEventListener("loadeddata", onLoaded);
    if (v.readyState >= 2) onLoaded();

    // Mouse listener no document inteiro (não só no container)
    document.addEventListener("mousemove", handleMouseMove);

    const tick = () => {
      const video = videoRef.current;
      if (!video || !durationRef.current) {
        rafIdRef.current = requestAnimationFrame(tick);
        return;
      }

      // Se não tem mouse, oscila suavemente (idle)
      if (!hasMouseRef.current) {
        const t = performance.now() / 1000;
        const sin = (Math.sin((t * 2 * Math.PI) / IDLE_CYCLE_SECONDS) + 1) / 2;
        // Oscila entre 20% e 80% do vídeo (evita os extremos)
        targetTimeRef.current = (0.2 + sin * 0.6) * durationRef.current;
      }

      // Lerp: interpola suavemente
      const diff = targetTimeRef.current - currentTimeRef.current;
      if (Math.abs(diff) > 0.001) {
        currentTimeRef.current += diff * LERP_FACTOR;
        // Clamp para não sair dos limites do vídeo
        currentTimeRef.current = Math.max(
          0,
          Math.min(currentTimeRef.current, durationRef.current - 0.01),
        );
        video.currentTime = currentTimeRef.current;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      document.removeEventListener("mousemove", handleMouseMove);
      v.removeEventListener("loadeddata", onLoaded);
    };
  }, [handleMouseMove]);

  /* ── Barra de progresso simulada ────────────────────────────────────── */
  useEffect(() => {
    if (progresso >= 100) return;
    const intervalo = 60 + Math.random() * 140;
    const incremento = 1 + Math.random() * 3;
    const timer = setTimeout(() => {
      setProgresso((p) => Math.min(p + incremento, 100));
    }, intervalo);
    return () => clearTimeout(timer);
  }, [progresso]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#2a3a4a]",
        className,
      )}
    >
      {/* 1. VÍDEO DE FUNDO — pausado, controlado via currentTime */}
      <video
        ref={videoRef}
        src="/blink4k.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 40%" }}
      />

      {/* Vinheta escurecendo as bordas — mantém o texto legível */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 30%, rgba(18, 28, 38, 0.65) 100%)",
        }}
      />

      {/* Gradiente inferior para a área de texto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
        style={{
          background:
            "linear-gradient(to top, rgba(18, 28, 38, 0.9) 0%, rgba(18, 28, 38, 0.6) 50%, transparent 100%)",
        }}
      />

      {/* 2. CONTEÚDO */}
      <div className="relative z-10 flex flex-col items-center gap-6 mt-auto pb-[8vh]">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-medium text-white/90 sm:text-3xl">
            Bem-vindo ao
          </h1>
          <p className="font-brand text-3xl font-bold tracking-tight text-[#FFDA5B] sm:text-4xl">
            Gestor de Automações
          </p>
        </div>

        <p className="max-w-md text-center text-[13px] leading-relaxed text-white/60">
          Estamos preparando tudo. O BLINK fica de olho em você enquanto isso.
        </p>

        {/* Barra de progresso */}
        <div className="w-full max-w-md space-y-2">
          <div className="relative h-[6px] w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progresso}%`,
                background:
                  "linear-gradient(90deg, #FFDA5B 0%, #FFE88A 100%)",
                boxShadow: "0 0 12px rgba(255, 218, 91, 0.4)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px] text-white/40">
            <span>{estado ?? "Carregando seus módulos..."}</span>
            <span>{Math.round(progresso)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
});
