import { memo } from "react";
import { cn } from "@/lib/utils";
import { Blink } from "./Blink";

/**
 * BLINK DE PARAQUEDAS — o carregamento do sistema.
 *
 * POR QUE A VERSÃO ANTERIOR NÃO PARECIA UM PARAQUEDISTA
 *
 * Ela montava tudo dentro de um `<svg>` e, lá dentro, abria outro `<svg>` que
 * continha o componente `<Blink />` — que por sua vez é um terceiro `<svg>`.
 * Três níveis aninhados, e o `className="w-full h-full"` do meio não faz nada
 * dentro de SVG (não é HTML: quem manda ali é `width`/`height`/`viewBox`). O
 * rosto saía fora de escala e desalinhado do corpo.
 *
 * O corpo também era o problema: retângulos finos com contorno de 1px, braços
 * e pernas do mesmo peso das cordas. Lido de longe, vira vareta.
 *
 * COMO É AGORA
 *
 * Composição em HTML, não aninhamento: um SVG desenha só o velame e as
 * cordas, e o `<Blink />` original entra abaixo como irmão, no tamanho que
 * ele já sabe se desenhar. Zero duplicação da arte dele, zero conflito de
 * viewBox — e no dia em que o desenho do Blink mudar, isto acompanha sozinho.
 *
 * As cordas terminam exatamente onde a cabeça dele começa, então a emenda
 * some. É o único acerto de números que este arquivo pede: `CORDA_ESQ` e
 * `CORDA_DIR` precisam bater com `LARGURA_BLINK`.
 *
 * TAMANHO
 * `clamp(170px, 24vmin, 280px)`: substancial no celular, sem virar outdoor no
 * monitor grande. `vmin` e não `vw` porque em tela deitada e baixa (notebook
 * antigo) o `vw` estouraria a altura disponível.
 */

/** Onde as cordas encostam, em % da largura do conjunto. */
const CORDA_ESQ = 34;
const CORDA_DIR = 66;
/** O Blink ocupa daqui até o espelho disto — precisa conter as cordas. */
const LARGURA_BLINK = 46;

/**
 * O VÃO ENTRE A CORDA E A CABEÇA, e por que ele existia.
 *
 * O `<Blink />` tem viewBox 220×220, mas o desenho só começa em y≈34 — a
 * ponta da antena. Ou seja, 15% da altura dele é espaço vazio no topo. As
 * cordas terminavam no fim do MEU svg, vinha esse vazio, e só então a cabeça:
 * as cordas ficavam penduradas no ar.
 *
 * O recuo desfaz isso. Margem percentual resolve contra a LARGURA do pai (o
 * conjunto), então: 15,5% do vazio × 46% que o Blink ocupa ≈ 7% — e uso 10%
 * para as cordas entrarem um pouco atrás da cabeça, que é como arnês parece
 * de verdade. Ele desenha depois no DOM, então cobre as pontas sozinho.
 *
 * Se o desenho do Blink mudar de enquadramento, este número muda junto.
 */
const RECUO_BLINK = 10;

export const BlinkCarregando = memo(function BlinkCarregando({
  mensagem,
  nuvens = true,
  className,
}: {
  mensagem?: string;
  /** Desligue em caixa pequena: vento e nuvens precisam de altura para subir. */
  nuvens?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "parachute-loader relative flex h-full w-full min-h-[220px] flex-col items-center justify-center overflow-hidden",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {nuvens && (
        <>
          {/* Sete linhas, não cinco: com poucas, cada uma é vista sozinha e
              lê como risco perdido. É a quantidade que transforma traço em
              fluxo. A posição e o ritmo de cada uma estão no CSS. */}
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <div key={n} className={`wind-line wind-${n}`} />
          ))}
          <div className="cloud cloud-1" />
          <div className="cloud cloud-2" />
        </>
      )}

      <div
        className="parachutist-wrapper relative z-10"
        style={{ width: "clamp(170px, 24vmin, 280px)" }}
      >
        {/* VELAME E CORDAS.
            `overflow-visible` porque o brilho do velame passa da borda do
            viewBox, e cortado ali ele ganharia uma linha reta no topo. */}
        <svg
          viewBox="0 0 200 132"
          className="block w-full overflow-visible"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          {/* Cúpula. Um arco só, largo e baixo — cúpula alta demais lê como
              balão, e o gesto que queremos é de descida controlada. */}
          <path d="M 12 72 Q 100 -8 188 72 Z" fill="hsl(var(--primary))" />

          {/* Gomos: o mesmo desenho repartido, com preto por cima em opacidade
              baixa. É o que dá volume sem precisar de gradiente — e gradiente
              em SVG de tela de carregamento é peso que não se paga. */}
          <path d="M 12 72 Q 56 8 68 72 Z" fill="hsl(0 0% 0% / 0.14)" />
          <path d="M 132 72 Q 144 8 188 72 Z" fill="hsl(0 0% 0% / 0.14)" />
          <path d="M 68 72 Q 100 -2 132 72 Z" fill="hsl(0 0% 100% / 0.16)" />

          {/* Borda inferior do velame: uma sombra fina que separa o pano do
              ar e evita o aspecto de recorte chapado. */}
          <path
            d="M 12 72 Q 100 60 188 72"
            fill="none"
            stroke="hsl(0 0% 0% / 0.22)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Cordas. Quatro, e não duas: com duas o conjunto lê como balão
              amarrado; a quarta corda é o que diz "paraquedas". */}
          <g
            stroke="hsl(var(--foreground) / 0.45)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            <line x1="14" y1="72" x2={CORDA_ESQ * 2} y2="130" />
            <line x1="70" y1="70" x2={CORDA_ESQ * 2 + 8} y2="130" />
            <line x1="130" y1="70" x2={CORDA_DIR * 2 - 8} y2="130" />
            <line x1="186" y1="72" x2={CORDA_DIR * 2} y2="130" />
          </g>
        </svg>

        {/* O BLINK ORIGINAL, inteiro e no lugar. */}
        <div
          className="relative mx-auto"
          style={{ width: `${LARGURA_BLINK}%`, marginTop: `-${RECUO_BLINK}%` }}
        >
          <Blink className="h-auto w-full" />
        </div>
      </div>

      {mensagem && (
        <div className="relative z-20 mt-8 max-w-xs text-center text-[13px] text-muted-foreground">
          {mensagem}
        </div>
      )}
      {!mensagem && <span className="sr-only">Carregando</span>}
    </div>
  );
});
