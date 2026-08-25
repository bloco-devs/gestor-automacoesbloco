import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "./Blink";

/**
 * BLINK SALTANDO — o carregador do sistema.
 *
 * DE ONDE VEIO
 * A curva do salto é adaptada de um efeito do Uiverse (forzayt): agachar,
 * esticar no impulso, girar no ar, achatar no impacto, assentar. É essa
 * sequência que faz parecer PESO — um `translateY` puro lê como elevador.
 *
 * Do original ficou só o movimento. O ovo de páscoa, as listras e a paleta
 * saíram: quem salta aqui é o Blink, que já existe em SVG e já é o rosto da
 * IA no sistema. Um mascote diferente no carregamento seria um segundo
 * personagem, e o sistema não tem dois.
 *
 * ONDE USAR, E ONDE NÃO
 * Serve para espera com rosto: rota carregando, o Blink pensando, tela cheia.
 * NÃO substitui `Skeleton` em lista nem em tabela — ali o que informa é a
 * forma do conteúdo que vai chegar, e trocar isso por um boneco pulando
 * esconde a estrutura e ainda rouba a atenção para o lado errado da tela.
 *
 * Regra prática: se a espera tem um lugar definido na tela, use Skeleton. Se
 * a tela inteira está esperando, use isto.
 *
 * MOVIMENTO E ENJOO
 * Como aparece em toda espera, o salto seria repetição constante para quem
 * tem sensibilidade vestibular. Com `prefers-reduced-motion` ele não para —
 * vira pulsação suave. Parar de vez tiraria o sinal de "algo está
 * acontecendo" justamente de quem mais precisa dele.
 */

const TAMANHOS = {
  sm: { caixa: "h-16", blink: "size-10", sombra: "w-10" },
  md: { caixa: "h-28", blink: "size-16", sombra: "w-16" },
  lg: { caixa: "h-40", blink: "size-24", sombra: "w-24" },
} as const;

function Nuvem({ classe, duracao, atraso }: { classe: string; duracao: string; atraso: string }) {
  return (
    <div
      className={cn(
        "blink-nuvem pointer-events-none absolute rounded-full bg-foreground/[0.06]",
        "before:absolute before:-top-1/2 before:left-1/4 before:size-[70%] before:rounded-full before:bg-foreground/[0.06] before:content-['']",
        classe,
      )}
      style={{ animationDuration: duracao, animationDelay: atraso }}
      aria-hidden
    />
  );
}

export const BlinkCarregando = memo(function BlinkCarregando({
  tamanho = "md",
  mensagem,
  nuvens = true,
  className,
}: {
  tamanho?: keyof typeof TAMANHOS;
  /** Uma linha dizendo o que está acontecendo. Silêncio também é resposta. */
  mensagem?: string;
  /** Desligue em espaço apertado — elas precisam de largura para atravessar. */
  nuvens?: boolean;
  className?: string;
}) {
  const t = TAMANHOS[tamanho];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      /**
       * `status` + `aria-live="polite"` anuncia a espera a quem usa leitor de
       * tela, sem interromper o que estiver sendo lido. O SVG do Blink já tem
       * rótulo próprio, então é escondido aqui para não anunciar duas vezes.
       */
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative flex w-full items-end justify-center overflow-hidden", t.caixa)}>
        {nuvens && (
          <>
            <Nuvem classe="left-0 top-[15%] h-2 w-14" duracao="6s" atraso="0s" />
            <Nuvem classe="left-0 top-[38%] h-1.5 w-10 opacity-70" duracao="4.5s" atraso="-1.5s" />
            <Nuvem classe="left-0 top-[8%] h-1.5 w-12 opacity-50" duracao="7.5s" atraso="-3s" />
          </>
        )}

        <div className="relative flex flex-col items-center">
          <div className="blink-salta" aria-hidden>
            <Blink className={t.blink} />
          </div>
          {/* A sombra fica FORA do elemento que salta: se estivesse dentro,
              herdaria o mesmo transform e subiria junto com ele — que é
              exatamente o que uma sombra não faz. */}
          <div
            className={cn("blink-chao mt-1 h-1.5 rounded-[50%] bg-foreground", t.sombra)}
            aria-hidden
          />
        </div>
      </div>

      {mensagem && (
        <p className="max-w-xs text-center text-[13px] text-muted-foreground">{mensagem}</p>
      )}
      {!mensagem && <span className="sr-only">Carregando</span>}
    </div>
  );
});
