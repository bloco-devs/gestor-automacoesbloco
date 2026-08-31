import { memo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A TELA DE ENTRADA DO SISTEMA — com o Blink 3D em vídeo.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SISTEMA DE RASTREAMENTO DO CURSOR — SPRING-DAMPER
 * ═══════════════════════════════════════════════════════════════════════
 *
 * O BLINK acompanha o ponteiro do mouse com inércia, peso e intenção.
 * A ideia não é "cursor controla cabeça", mas sim "o BLINK percebe o
 * cursor e decide olhar para ele".
 *
 * PIPELINE
 *
 *   MOUSE (evento bruto)
 *     → normaliza para [-1, +1] relativo ao centro da tela
 *     → aplica filtro de histerese (ignora micro-variações)
 *     → aplica zona central de baixa sensibilidade (dead zone suave)
 *     → aplica curva de sensibilidade progressiva (power curve)
 *     → escala eixo Y com sensibilidade reduzida
 *     → clamp na amplitude máxima
 *     → gera TARGET
 *
 *   ANIMAÇÃO (requestAnimationFrame — um único loop)
 *     → calcula delta time para consistência em qualquer FPS
 *     → detecta inatividade do mouse → blend gradual para idle
 *     → calcula target efetivo (blend tracking ↔ idle)
 *     → atualiza spring-damper (posição + velocidade)
 *     → aplica currentTime do vídeo (eixo horizontal)
 *     → aplica parallax vertical (CSS transform, sutil)
 *
 * POR QUE SPRING-DAMPER E NÃO LERP
 *
 *   Um lerp (`current += diff * factor`) é um sistema de primeira ordem:
 *   não tem velocidade, não tem peso. Quando o target inverte, o sistema
 *   imediatamente começa a seguir — não há desaceleração antes da mudança
 *   de direção.
 *
 *   O spring-damper (mola-amortecedor) é um sistema de segunda ordem com
 *   estado duplo: POSIÇÃO e VELOCIDADE. Quando o target inverte:
 *
 *     1. A velocidade atual ainda aponta na direção antiga
 *     2. A mola puxa na direção nova, mas precisa vencer a velocidade
 *     3. O sistema desacelera, para, e então inverte
 *     4. O amortecimento crítico garante que não há overshoot
 *
 *   Isso cria a sensação de peso, inércia e intenção. O BLINK parece
 *   "decidir" mudar de direção, não "ser puxado" instantaneamente.
 *
 *   A física: F = ω²·(target - pos) - 2ζω·vel
 *   Com ζ = 1 (amortecimento crítico), o sistema alcança o target
 *   sem oscilar e sem ultrapassar.
 *
 * LIMITAÇÃO DO FORMATO VÍDEO
 *
 *   O Blink é um vídeo pré-gravado, não um modelo 3D. Não é possível
 *   separar olhos, cabeça e corpo (requisito 9). O video scrubbing
 *   (posição X → currentTime) é o mecanismo de controle horizontal.
 *   A resposta vertical é aproximada via deslocamento CSS.
 *
 * PARÂMETROS
 *
 *   Todos os valores ajustáveis estão no objeto TRACKING abaixo.
 *   A tabela no final do arquivo documenta o que cada um controla.
 */

// ═══════════════════════════════════════════════════════════════════════
// PARÂMETROS AJUSTÁVEIS
//
// Altere livremente sem mexer na lógica principal.
// Cada valor controla um aspecto específico do comportamento.
// ═══════════════════════════════════════════════════════════════════════

const TRACKING = {
  // ── 1. Zona central de baixa sensibilidade ──────────────────────
  /** Raio normalizado (0–1) da zona central onde a resposta é mínima.
   *  Dentro deste raio, o BLINK praticamente continua olhando para frente.
   *  Não é um hard cutoff: a resposta sobe suavemente a partir de zero.
   *  0.12 = os primeiros 12% de distância do centro quase não geram
   *  reação perceptível. */
  DEAD_ZONE_RADIUS: 0.12,

  // ── 2. Curva de sensibilidade progressiva ───────────────────────
  /** Expoente da power curve aplicada após a dead zone.
   *    1.0 = linear (sem curva, não recomendado)
   *    2.0 = quadrática
   *    2.4 = progressiva não-linear (padrão)
   *    3.0 = agressivamente progressiva
   *  Valores maiores reduzem a sensibilidade no centro e amplificam
   *  nas bordas. */
  SENSITIVITY_POWER: 2.4,

  /** Fator de escala do eixo Y relativo ao X.
   *  O BLINK não deve olhar excessivamente para cima/baixo.
   *  0.55 = resposta vertical é 55% da horizontal.
   *  Equivale a: horizontal ~±12°, vertical ~±7°. */
  SENSITIVITY_SCALE_Y: 0.55,

  // ── 3. Amplitude máxima ─────────────────────────────────────────
  /** Offset máximo em segundos de vídeo a partir do centro da timeline.
   *  O vídeo de 10s tem centro em 5s. Com MAX_OFFSET = 2.5, o range
   *  efetivo é 2.5s–7.5s. Equivale à "rotação horizontal máxima"
   *  de aproximadamente ±12°. */
  MAX_OFFSET: 2.5,

  /** Deslocamento vertical máximo em pixels (parallax CSS).
   *  Limitação do formato vídeo: não é rotação real, é deslocamento
   *  do enquadramento. 6px = resposta sutil mas perceptível. */
  MAX_PARALLAX_Y_PX: 6,

  // ── 4. Spring-damper (inércia e peso) ───────────────────────────
  /** Frequência natural da mola (ω).
   *  Controla a velocidade geral de resposta do BLINK.
   *  Tempo para alcançar 95% do target ≈ 3/ω.
   *    2.0 = lento, peso extremo (~1.5s)
   *    3.0 = peso natural, equilibrado (~1.0s) — padrão
   *    4.5 = responsivo mas com inércia (~0.7s) */
  SPRING_FREQUENCY: 3.0,

  /** Razão de amortecimento (ζ).
   *  Controla se o sistema oscila ou não ao chegar no target.
   *    < 1.0 = sub-amortecido (oscila/ultrapassa o target)
   *    = 1.0 = amortecimento crítico (sem overshoot) — padrão
   *    > 1.0 = sobre-amortecido (mais lento, nenhum risco de overshoot)
   *  Use 1.0. Só aumente se houver tremor residual. */
  DAMPING_RATIO: 1.0,

  // ── 5. Histerese / estabilidade ─────────────────────────────────
  /** Mudança mínima normalizada do cursor para atualizar o target.
   *  Impede que micro-tremores e oscilação do mouse causem reação.
   *  Comparação é feita contra a última posição ACEITA.
   *  0.015 = ignora movimentos menores que ~1.5% da tela. */
  HYSTERESIS_THRESHOLD: 0.015,

  /** Intervalo mínimo (ms) entre atualizações de target.
   *  Quando este tempo expira, qualquer movimento (mesmo abaixo do
   *  threshold) atualiza o target — impede que ele fique preso.
   *  A animação continua suave entre atualizações graças ao spring.
   *  120ms = ~8 atualizações de target/segundo no máximo. */
  HYSTERESIS_WINDOW_MS: 120,

  // ── 6. Detecção de inatividade ──────────────────────────────────
  /** Tempo (ms) sem movimento antes do BLINK começar a relaxar.
   *  6000 = 6 segundos. */
  IDLE_TIMEOUT_MS: 6000,

  /** Velocidade (por segundo) com que o blend de inatividade cresce.
   *  Controla quão rápido o BLINK começa a soltar o target do mouse
   *  e migrar para a posição neutra.
   *  0.35 = leva ~3s para dominar completamente após o timeout.
   *  Transição extremamente gradual — sem salto perceptível. */
  IDLE_BLEND_SPEED: 0.35,

  /** Velocidade com que o idle se dissolve quando o mouse volta.
   *  3.0 = retoma o tracking em ~0.3s. Rápido o bastante para não
   *  sentir delay, lento o bastante para não dar um tranco. */
  IDLE_RECOVER_SPEED: 3.0,

  // ── 7. Oscilação autônoma (idle) ────────────────────────────────
  /** Período em segundos da oscilação suave quando inativo.
   *  O BLINK balança levemente em vez de ficar estático.
   *  14 = um ciclo completo de ida e volta leva 14 segundos. */
  IDLE_CYCLE_SECONDS: 14,

  /** Amplitude da oscilação idle (fração de MAX_OFFSET normalizado).
   *  0.10 = oscila em ±10% do range máximo — quase imperceptível.
   *  O BLINK parece "respirar" sem parecer animatronic. */
  IDLE_AMPLITUDE: 0.10,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// CURVA DE SENSIBILIDADE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Transforma um valor normalizado [-1, +1] aplicando:
 *
 *   1. Dead zone suave — dentro de DEAD_ZONE_RADIUS, a saída é zero.
 *      Acima, sobe de forma contínua. Sem degrau, sem snap.
 *
 *   2. Power curve — eleva o valor remapeado ao expoente.
 *      Resultado: movimentos pequenos → resposta muito pequena.
 *      Movimentos grandes → resposta maior. Nunca ultrapassa ±1.
 *
 * O BLINK NÃO reage a cada pixel. Ele reage a intenção.
 */
function applyCurve(raw: number): number {
  const sign = Math.sign(raw);
  const abs = Math.abs(raw);

  // Remap: desloca o range para que dead zone comece em zero.
  const { DEAD_ZONE_RADIUS, SENSITIVITY_POWER } = TRACKING;
  const remapped = Math.max(
    0,
    (abs - DEAD_ZONE_RADIUS) / (1 - DEAD_ZONE_RADIUS),
  );

  // Power curve: resposta progressiva não-linear.
  return sign * Math.min(Math.pow(remapped, SENSITIVITY_POWER), 1);
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════

export const BoasVindas = memo(function BoasVindas({
  estado,
  className,
}: {
  /** O que está acontecendo agora. Uma linha, sem ponto final. */
  estado?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progresso, setProgresso] = useState(0);

  /* ── Estado mutável do tracking (refs, sem re-render) ─────────────
   *  Tudo que muda a cada frame vive aqui. Nenhum setState no loop
   *  de animação — zero re-renders causados pelo tracking.
   * ─────────────────────────────────────────────────────────────── */
  const tracking = useRef({
    // Última posição aceita pelo filtro de histerese [-1, +1]
    acceptedX: 0,
    acceptedY: 0,

    // Target processado (após dead zone + curva + escala Y)
    targetX: 0,
    targetY: 0,

    // ── Spring-damper state ──────────────────────────────────────
    // POSIÇÃO: onde o BLINK está olhando agora
    currentX: 0,
    currentY: 0,
    // VELOCIDADE: quão rápido a posição está mudando
    // É a velocidade que cria INÉRCIA. Quando o target inverte,
    // a velocidade precisa desacelerar antes de inverter.
    velocityX: 0,
    velocityY: 0,

    // Timestamps
    lastTargetUpdate: 0, // Quando o target mudou pela última vez
    lastMouseMove: 0,    // Quando o mouse se moveu pela última vez
    lastFrameTime: 0,    // Último frame do rAF (para calcular dt)

    // Estado de inatividade
    idleBlend: 1,   // 0 = tracking ativo, 1 = idle completo (começa idle)
    hasMouse: false, // Já recebeu algum evento de mouse?

    // Vídeo
    duration: 10, // Duração em segundos (atualizado em loadeddata)
    rafId: 0,     // ID do requestAnimationFrame ativo
  });

  /* ══════════════════════════════════════════════════════════════════
   *  EFEITO PRINCIPAL
   *
   *  Um único useEffect registra:
   *    - Um mousemove listener (atualiza target)
   *    - Um requestAnimationFrame loop (anima o spring-damper)
   *    - Um loadeddata listener (inicializa o vídeo)
   *
   *  O cleanup remove tudo. Nenhuma duplicação, nenhum listener
   *  órfão, nenhum rAF perdido.
   * ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const s = tracking.current;

    // ── Inicialização do vídeo ──────────────────────────────────────
    const onLoaded = () => {
      s.duration = video.duration || 10;
      const mid = s.duration / 2;
      video.currentTime = mid;
      // Zerar todo o estado do spring — começa do repouso
      s.currentX = 0;
      s.currentY = 0;
      s.velocityX = 0;
      s.velocityY = 0;
      s.targetX = 0;
      s.targetY = 0;
      video.pause();
    };
    video.addEventListener("loadeddata", onLoaded);
    if (video.readyState >= 2) onLoaded();

    // ── Mouse handler ───────────────────────────────────────────────
    // Um único listener no document. Atualiza apenas o TARGET.
    // A animação visual acontece exclusivamente no rAF.
    // Nenhum setState aqui — zero re-renders.
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      s.hasMouse = true;
      s.lastMouseMove = now;

      // Normalizar para [-1, +1] (centro da tela = 0)
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = (e.clientY / window.innerHeight) * 2 - 1;

      // ── Histerese ──────────────────────────────────────────────
      // Compara contra a última posição ACEITA (não a bruta).
      // Isso impede acúmulo silencioso de micro-movimentos.
      //
      // Passa se:
      //   - distância > threshold (movimento significativo), OU
      //   - tempo > janela (impede target preso indefinidamente)
      const dx = normX - s.acceptedX;
      const dy = normY - s.acceptedY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const timeSince = now - s.lastTargetUpdate;

      if (
        dist < TRACKING.HYSTERESIS_THRESHOLD &&
        timeSince < TRACKING.HYSTERESIS_WINDOW_MS
      ) {
        return;
      }

      // Aceitar esta posição
      s.acceptedX = normX;
      s.acceptedY = normY;

      // Aplicar dead zone + curva → target
      // O eixo Y recebe escala reduzida (SENSITIVITY_SCALE_Y)
      s.targetX = applyCurve(normX);
      s.targetY = applyCurve(normY) * TRACKING.SENSITIVITY_SCALE_Y;

      s.lastTargetUpdate = now;
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });

    // ── Animation loop (requestAnimationFrame) ──────────────────────
    // Um único loop. Toda a física e aplicação visual acontecem aqui.
    const tick = (timestamp: number) => {
      const vid = videoRef.current;
      if (!vid || !s.duration) {
        s.rafId = requestAnimationFrame(tick);
        return;
      }

      // Delta time em segundos, com cap para evitar saltos quando
      // a tab fica em background.
      // Cap de 100ms = mínimo 10fps virtual. Evita explosão do spring.
      const dt = s.lastFrameTime
        ? Math.min((timestamp - s.lastFrameTime) / 1000, 0.1)
        : 1 / 60;
      s.lastFrameTime = timestamp;

      // ── Detecção de inatividade ────────────────────────────────
      // O blend de idle cresce gradualmente após IDLE_TIMEOUT_MS
      // sem movimento, e dissolve quando o mouse volta a se mover.
      // A transição é extremamente suave — sem salto perceptível.
      const timeSinceMove = timestamp - s.lastMouseMove;

      if (!s.hasMouse || timeSinceMove > TRACKING.IDLE_TIMEOUT_MS) {
        s.idleBlend = Math.min(
          1,
          s.idleBlend + TRACKING.IDLE_BLEND_SPEED * dt,
        );
      } else {
        s.idleBlend = Math.max(
          0,
          s.idleBlend - TRACKING.IDLE_RECOVER_SPEED * dt,
        );
      }

      // ── Target efetivo (blend tracking ↔ idle) ─────────────────
      // Idle: oscilação senoidal lenta perto do centro.
      // Quando idleBlend = 0: target do mouse.
      // Quando idleBlend = 1: oscilação + Y neutro.
      // Transição contínua entre os dois — sem snap.
      const idleT = timestamp / 1000;
      const idleOsc =
        Math.sin((idleT * 2 * Math.PI) / TRACKING.IDLE_CYCLE_SECONDS) *
        TRACKING.IDLE_AMPLITUDE;

      const effectiveX =
        s.targetX * (1 - s.idleBlend) + idleOsc * s.idleBlend;
      const effectiveY = s.targetY * (1 - s.idleBlend);
      // Y vai para 0 no idle (BLINK olha para frente, não para cima/baixo)

      // ── Spring-damper (amortecimento crítico) ──────────────────
      //
      // F = ω²·(target - pos) - 2ζω·vel
      //
      // ω  = frequência natural (SPRING_FREQUENCY)
      // ζ  = razão de amortecimento (DAMPING_RATIO, =1 para crítico)
      //
      // O sistema tem DOIS estados: posição e velocidade.
      // Quando o target inverte direção:
      //   1. A velocidade atual ainda aponta na direção antiga
      //   2. A mola puxa na direção nova
      //   3. Mas precisa vencer a inércia (velocidade) primeiro
      //   4. O BLINK desacelera → para → inverte → alcança
      //   5. O amortecimento crítico garante: sem overshoot
      //
      // Isso é o que cria a sensação de PESO e INTENÇÃO.
      //
      const omega = TRACKING.SPRING_FREQUENCY;
      const omegaSq = omega * omega;
      const dampCoeff = 2 * TRACKING.DAMPING_RATIO * omega;

      // Eixo X (horizontal — video scrubbing)
      const forceX = omegaSq * (effectiveX - s.currentX);
      const dragX = dampCoeff * s.velocityX;
      s.velocityX += (forceX - dragX) * dt;
      s.currentX += s.velocityX * dt;

      // Eixo Y (vertical — parallax)
      const forceY = omegaSq * (effectiveY - s.currentY);
      const dragY = dampCoeff * s.velocityY;
      s.velocityY += (forceY - dragY) * dt;
      s.currentY += s.velocityY * dt;

      // ── Aplicar ao vídeo (horizontal: currentTime) ─────────────
      const center = s.duration / 2;
      const newTime = center + s.currentX * TRACKING.MAX_OFFSET;
      const clampedTime = Math.max(
        0.01,
        Math.min(newTime, s.duration - 0.01),
      );

      // Só faz seek se a mudança for perceptível.
      // Evita decode desnecessário quando o BLINK está parado.
      if (Math.abs(vid.currentTime - clampedTime) > 0.005) {
        vid.currentTime = clampedTime;
      }

      // ── Aplicar parallax vertical (CSS transform) ──────────────
      // scale(1.02) compensa o deslocamento para não revelar bordas.
      // O transform é aplicado via DOM direto — não causa re-render.
      const parallaxY = s.currentY * TRACKING.MAX_PARALLAX_Y_PX;
      vid.style.transform = `scale(1.02) translateY(${parallaxY.toFixed(1)}px)`;

      s.rafId = requestAnimationFrame(tick);
    };

    s.rafId = requestAnimationFrame(tick);

    // ── Cleanup ─────────────────────────────────────────────────────
    // Remove tudo. Nenhum listener órfão, nenhum rAF perdido.
    return () => {
      cancelAnimationFrame(s.rafId);
      document.removeEventListener("mousemove", onMouseMove);
      video.removeEventListener("loadeddata", onLoaded);
    };
  }, []); // Sem dependências — refs são estáveis

  /* ── Barra de progresso simulada ──────────────────────────────────
   *  useEffect separado. Causa re-renders (setState), mas não afeta
   *  o tracking — o vídeo é controlado por refs e DOM direto.
   * ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (progresso >= 100) return;
    const intervalo = 60 + Math.random() * 140;
    const incremento = 1 + Math.random() * 3;
    const timer = setTimeout(() => {
      setProgresso((p) => Math.min(p + incremento, 100));
    }, intervalo);
    return () => clearTimeout(timer);
  }, [progresso]);

  /* ── JSX (visual completamente inalterado) ────────────────────── */
  return (
    <div
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#2a3a4a]",
        className,
      )}
    >
      {/* VÍDEO DE FUNDO — pausado, controlado via currentTime + transform */}
      <video
        ref={videoRef}
        src="/blink4k.mp4"
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "center 40%", willChange: "transform" }}
      />

      {/* Vinheta escurecendo as bordas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 30%, rgba(18, 28, 38, 0.65) 100%)",
        }}
      />

      {/* Gradiente inferior para legibilidade do texto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%]"
        style={{
          background:
            "linear-gradient(to top, rgba(18, 28, 38, 0.9) 0%, rgba(18, 28, 38, 0.6) 50%, transparent 100%)",
        }}
      />

      {/* CONTEÚDO */}
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
                background: "linear-gradient(90deg, #FFDA5B 0%, #FFE88A 100%)",
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

/*
 * ═══════════════════════════════════════════════════════════════════════
 * TABELA DE PARÂMETROS
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ┌─────────────────────────┬──────────┬───────────────────────────────┐
 * │ Parâmetro               │ Valor    │ Controla                      │
 * ├─────────────────────────┼──────────┼───────────────────────────────┤
 * │ DEAD_ZONE_RADIUS        │ 0.12     │ Zona central (sensibilidade)  │
 * │ SENSITIVITY_POWER       │ 2.4      │ Curva progressiva             │
 * │ SENSITIVITY_SCALE_Y     │ 0.55     │ Sensibilidade vertical (×X)   │
 * │ MAX_OFFSET              │ 2.5s     │ Rotação horizontal máxima     │
 * │ MAX_PARALLAX_Y_PX       │ 6px      │ Rotação vertical máxima       │
 * │ SPRING_FREQUENCY        │ 3.0      │ Damping / velocidade geral    │
 * │ DAMPING_RATIO           │ 1.0      │ Overshoot (1.0 = nenhum)      │
 * │ HYSTERESIS_THRESHOLD    │ 0.015    │ Estabilidade (anti-tremor)    │
 * │ HYSTERESIS_WINDOW_MS    │ 120ms    │ Janela mínima entre updates   │
 * │ IDLE_TIMEOUT_MS         │ 6000ms   │ Tempo até relaxar             │
 * │ IDLE_BLEND_SPEED        │ 0.35/s   │ Velocidade do fade para idle  │
 * │ IDLE_RECOVER_SPEED      │ 3.0/s    │ Velocidade de retorno ativo   │
 * │ IDLE_CYCLE_SECONDS      │ 14s      │ Período da oscilação idle     │
 * │ IDLE_AMPLITUDE          │ 0.10     │ Amplitude da oscilação idle   │
 * └─────────────────────────┴──────────┴───────────────────────────────┘
 *
 * COMO AJUSTAR
 *
 * "O BLINK reage rápido demais"
 *   → Diminuir SPRING_FREQUENCY (ex: 2.0)
 *   → Aumentar DEAD_ZONE_RADIUS (ex: 0.18)
 *   → Aumentar SENSITIVITY_POWER (ex: 3.0)
 *
 * "O BLINK reage devagar demais"
 *   → Aumentar SPRING_FREQUENCY (ex: 4.5)
 *   → Diminuir DEAD_ZONE_RADIUS (ex: 0.06)
 *
 * "O BLINK gira a cabeça demais"
 *   → Diminuir MAX_OFFSET (ex: 1.8)
 *   → Diminuir MAX_PARALLAX_Y_PX (ex: 3)
 *
 * "A mudança de direção é muito brusca"
 *   → Diminuir SPRING_FREQUENCY (ex: 2.0) — mais inércia
 *
 * "O BLINK oscila/ultrapassa o target"
 *   → Aumentar DAMPING_RATIO (ex: 1.1) — sobre-amortecido
 *
 * "O BLINK treme com o mouse parado"
 *   → Aumentar HYSTERESIS_THRESHOLD (ex: 0.025)
 *
 * "O BLINK demora demais para relaxar"
 *   → Diminuir IDLE_TIMEOUT_MS (ex: 4000)
 *   → Aumentar IDLE_BLEND_SPEED (ex: 0.6)
 */
